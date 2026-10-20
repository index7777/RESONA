import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleAudioApi } from '../worker/src/api.mjs';

const identity = { verifiedBy: 'res-service-binding', userId: 'u_audio_test1234' };
function audioDb() {
  const database = new DatabaseSync(':memory:');
  for (const name of ['0001_audio_wallet.sql','0002_audio_settlement.sql','0003_audio_generation_assets.sql','0004_remove_audio_asset_storage.sql'])
    database.exec(readFileSync(new URL(`../worker/migrations/${name}`, import.meta.url), 'utf8'));
  database.prepare('INSERT INTO audio_wallets(user_id,balance) VALUES(?,?)').run(identity.userId, 10);
  const d1 = {
    prepare(sql) { return { bind(...values) { return {
      sql, values,
      async first() { return database.prepare(sql).get(...values) ?? null; },
      async all() { return { results: database.prepare(sql).all(...values) }; },
      async run() { return database.prepare(sql).run(...values); },
    }; } }; },
    async batch(statements) {
      database.exec('BEGIN');
      try {
        const results = statements.map(item => ({ meta: database.prepare(item.sql).run(...item.values) }));
        database.exec('COMMIT'); return results;
      } catch (error) { database.exec('ROLLBACK'); throw error; }
    },
  };
  return { database, d1 };
}
const makeRequest = (path, body, method = 'POST', headers = {}) => new Request(`https://reslab.app${path}`, {
  method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined,
});
const authenticate = async () => identity;
function minimalWav() {
  const wav = Buffer.alloc(48);
  wav.write('RIFF', 0); wav.writeUInt32LE(40, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(44_100, 24); wav.writeUInt32LE(88_200, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
  wav.writeUInt32LE(4, 40); wav.writeInt16LE(0, 44); wav.writeInt16LE(0, 46);
  return wav;
}

test('unconfigured prices/providers keep paid AI generation disabled before any reservation', async () => {
  const { database, d1 } = audioDb();
  try {
    const response = await handleAudioApi(makeRequest('/audio/api/quote', { kind: 'sfx', prompt: 'thunder', durationSeconds: 2 }),
      { AUDIO_DB: d1, AUDIO_GENERATION_ENABLED: 'true', AUDIO_SFX_CREDITS_PER_10S: '3' }, authenticate);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'GENERATION_NOT_CONFIGURED');
    assert.equal(database.prepare('SELECT COUNT(*) AS n FROM audio_generation_jobs').get().n, 0);
  } finally { database.close(); }
});

test('provider duration minimum is enforced before quote or credit reservation', async () => {
  const { database, d1 } = audioDb();
  try {
    const response = await handleAudioApi(makeRequest('/audio/api/quote', { kind: 'sfx', prompt: 'Short thunder', durationSeconds: 0.5 }),
      { AUDIO_DB: d1, AUDIO_GENERATION_ENABLED: 'true', STABILITY_API_KEY: 'mock-only', AUDIO_SFX_CREDITS_PER_10S: '3' }, authenticate);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'INVALID_QUOTE_REQUEST');
    assert.equal(database.prepare('SELECT COUNT(*) AS n FROM audio_generation_jobs').get().n, 0);
  } finally { database.close(); }
});

test('Gemini cost quote stays closed until the monetary value of an Audio Credit is configured', async () => {
  const { database, d1 } = audioDb();
  try {
    const response = await handleAudioApi(makeRequest('/audio/api/quote', { kind: 'bgm', prompt: 'Battle music', durationSeconds: 20 }),
      { AUDIO_DB: d1, AUDIO_GENERATION_ENABLED: 'true', GEMINI_API_KEY: 'mock-only' }, authenticate);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'PRICING_NOT_CONFIGURED');
    assert.equal(database.prepare('SELECT COUNT(*) AS n FROM audio_quotes').get().n, 0);
    assert.equal(database.prepare('SELECT balance FROM audio_wallets WHERE user_id=?').get(identity.userId).balance, 10);
  } finally { database.close(); }
});

test('quote -> two generated variants delivered to browser memory -> one settlement and no audio storage', async () => {
  const { database, d1 } = audioDb();
  let providerCalls = 0;
  const env = {
    AUDIO_DB: d1,
    AUDIO_GENERATION_ENABLED: 'true',
    AUDIO_SFX_GENERATION_ENABLED: 'true',
    AUDIO_SFX_CREDITS_PER_10S: '3',
    SFX_CONTAINER: { getByName: () => ({ fetch: async () => new Response(minimalWav(), { status: 200, headers: { 'content-type': 'audio/wav', 'x-generation-duration-seconds': '2' } }) }) },
    SFX_FETCH: async (input, init) => {
      providerCalls += 1;
      assert.equal(init.method, 'POST');
      assert.match(String(input), /sfx\.internal\/v1\/generate/);
      return new Response(minimalWav(), { status: 200, headers: { 'content-type': 'audio/wav', 'x-generation-duration-seconds': '2' } });
    },
  };
  try {
    const quoteResponse = await handleAudioApi(makeRequest('/audio/api/quote', { kind: 'sfx', prompt: 'Rain and distant thunder', durationSeconds: 2, variants: 2 }), env, authenticate);
    assert.equal(quoteResponse.status, 201);
    const quote = await quoteResponse.json();
    assert.equal(quote.credits, 2);
    assert.equal(quote.provider, 'stable-audio-3-small-sfx-cloudflare');
    const generation = await handleAudioApi(makeRequest('/audio/api/generations', {
      quoteId: quote.quoteId, kind: 'sfx', prompt: 'Rain and distant thunder', durationSeconds: 2, variants: 2,
    }, 'POST', { 'idempotency-key': 'generation-thunder-v1' }), env, authenticate);
    const payload = await generation.json();
    assert.equal(generation.status, 201, JSON.stringify(payload));
    assert.equal(payload.status, 'succeeded');
    assert.equal(payload.retained, false);
    assert.equal(payload.results.length, 2);
    assert.deepEqual(payload.results.map(asset => asset.variant), [1, 2]);
    assert.deepEqual(payload.results.map(asset => Buffer.from(asset.audioBase64, 'base64').byteLength), [48, 48]);
    assert.deepEqual(payload.results.map(asset => asset.durationSeconds), [2, 2]);
    assert.equal(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='audio_assets'").get(), undefined);
    assert.equal(database.prepare('SELECT balance FROM audio_wallets WHERE user_id=?').get(identity.userId).balance, 8);
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM audio_credit_ledger WHERE event_type='reserve'").get().n, 1);

    const replay = await handleAudioApi(makeRequest('/audio/api/generations', {
      quoteId: quote.quoteId, kind: 'sfx', prompt: 'Rain and distant thunder', durationSeconds: 2, variants: 2,
    }, 'POST', { 'idempotency-key': 'generation-thunder-v1' }), env, authenticate);
    assert.equal(replay.status, 410);
    assert.equal(providerCalls, 2, 'idempotent retry does not call inference again');
    const replayPayload = await replay.json();
    assert.equal(replayPayload.code, 'RESULT_NOT_RETAINED');
    assert.equal(replayPayload.results, undefined, 'audio bytes are not recoverable from the server');
  } finally { database.close(); }
});

test('Gemini BGM quote uses fixed per-generation cost and returns actual duration as browser-measured', async () => {
  const { database, d1 } = audioDb();
  database.prepare('UPDATE audio_wallets SET balance=100 WHERE user_id=?').run(identity.userId);
  let providerCalls = 0;
  const env = {
    AUDIO_DB: d1, AUDIO_GENERATION_ENABLED: 'true', GEMINI_API_KEY: 'mock-only', AUDIO_CREDIT_VALUE_USD: '0.01',
    GEMINI_FETCH: async () => {
      providerCalls += 1;
      return Response.json({ steps: [{ type: 'model_output', content: [{ type: 'audio', data: Buffer.from([0x49,0x44,0x33,providerCalls]).toString('base64') }] }] });
    },
  };
  try {
    const quoteResponse = await handleAudioApi(makeRequest('/audio/api/quote', { kind: 'bgm', prompt: 'Boss battle theme', durationSeconds: 20, variants: 2 }), env, authenticate);
    assert.equal(quoteResponse.status, 201);
    const quote = await quoteResponse.json();
    assert.equal(quote.credits, 32, 'two $0.08 calls at a provisional 2x provider-cost multiplier, with $0.01 per Audio Credit');
    assert.equal(quote.provider, 'gemini-lyria-3.5');

    const generation = await handleAudioApi(makeRequest('/audio/api/generations', {
      quoteId: quote.quoteId, kind: 'bgm', prompt: 'Boss battle theme', durationSeconds: 20, variants: 2,
    }, 'POST', { 'idempotency-key': 'gemini-bgm-test-variant' }), env, authenticate);
    const result = await generation.json();
    assert.equal(generation.status, 201, JSON.stringify(result));
    assert.equal(result.results.length, 2);
    assert.deepEqual(result.results.map(item => item.durationSeconds), [null, null]);
    assert.equal(providerCalls, 2);
    assert.equal(database.prepare('SELECT balance FROM audio_wallets WHERE user_id=?').get(identity.userId).balance, 68);
    assert.equal(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='audio_assets'").get(), undefined);
  } finally { database.close(); }
});

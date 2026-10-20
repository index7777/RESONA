import { walletBalance, finalizeJob, refundJob, markJobUnknown, CreditError } from './wallet.mjs';
import { requireVerifiedIdentity } from './identity.mjs';
import { ProviderError } from './stability-audio.mjs';
import { generateGeminiBgm } from './gemini-lyria.mjs';
import { generateCloudflareSfx } from './cloudflare-sfx.mjs';

const respond = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const validPrompt = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 1000;
const hashText = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
const randomId = () => crypto.randomUUID().replaceAll('-', '');
function encodeAudio(audio) {
  const bytes = new Uint8Array(audio);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}
const priceFor = (env, kind, seconds, variants) => {
  if (kind === 'bgm') {
    const creditValueUsd = Number(env.AUDIO_CREDIT_VALUE_USD);
    const costMultiplier = Number(env.AUDIO_BGM_COST_MULTIPLIER ?? 2);
    if (!Number.isFinite(creditValueUsd) || creditValueUsd <= 0 || !Number.isFinite(costMultiplier) || costMultiplier < 1) return null;
    // Lyria 3.5 is billed at $0.08 per request. A 2x multiplier is a
    // provisional 50% gross margin against provider cost only.
    return Math.ceil((0.08 * costMultiplier / creditValueUsd) * variants);
  }
  const perTenSeconds = Number(kind === 'sfx' ? env.AUDIO_SFX_CREDITS_PER_10S : env.AUDIO_BGM_CREDITS_PER_10S);
  if (!Number.isSafeInteger(perTenSeconds) || perTenSeconds <= 0) return null;
  return Math.max(1, Math.ceil(seconds / 10 * perTenSeconds)) * variants;
};
const validRequest = body => ['sfx','bgm'].includes(body?.kind) && validPrompt(body?.prompt) &&
  Number.isFinite(body?.durationSeconds) && body.durationSeconds >= (body.kind === 'sfx' ? 1 : 3) && body.durationSeconds <= (body.kind === 'sfx' ? 30 : 180) &&
  [1,2].includes(body?.variants ?? 1);
const providerConfigured = (env, kind) => Boolean(kind === 'bgm'
  ? env.GEMINI_API_KEY
  : env.AUDIO_SFX_GENERATION_ENABLED === 'true' && env.SFX_CONTAINER);
async function createQuote(db, identity, body, env) {
  if (env.AUDIO_GENERATION_ENABLED !== 'true' || !providerConfigured(env, body.kind)) return respond(503, { code: 'GENERATION_NOT_CONFIGURED' });
  const variants = body.variants ?? 1;
  const credits = priceFor(env, body.kind, body.durationSeconds, variants);
  if (!credits) return respond(503, { code: 'PRICING_NOT_CONFIGURED' });
  const id = randomId();
  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  const promptHash = await hashText(body.prompt.trim());
  await db.prepare(`INSERT INTO audio_quotes (id,user_id,kind,prompt_hash,duration_seconds,variants,credits_total,expires_at)
    VALUES (?,?,?,?,?,?,?,?)`).bind(id, identity.userId, body.kind, promptHash, body.durationSeconds, variants, credits, expiresAt).run();
  return respond(201, { quoteId: id, kind: body.kind, provider: body.kind === 'bgm' ? 'gemini-lyria-3.5' : 'stable-audio-3-small-sfx-cloudflare', durationSeconds: body.durationSeconds, variants, credits, expiresAt });
}

async function generate(request, env, identity) {
  const rawBody = await request.clone().json().catch(() => null);
  if (env.AUDIO_GENERATION_ENABLED !== 'true' || !providerConfigured(env, rawBody?.kind)) return respond(503, { code: 'GENERATION_NOT_CONFIGURED' });
  if (!env.AUDIO_DB) return respond(503, { code: 'AUDIO_DB_NOT_CONFIGURED' });
  const body = await request.json().catch(() => null);
  const idempotencyKey = request.headers.get('idempotency-key') || '';
  if (!validRequest(body) || !/^[a-zA-Z0-9_-]{12,128}$/.test(idempotencyKey) || typeof body.quoteId !== 'string')
    return respond(400, { code: 'INVALID_GENERATION_REQUEST' });

  const prompt = body.prompt.trim();
  const variants = body.variants ?? 1;
  const requestHash = await hashText(JSON.stringify({ kind: body.kind, prompt, durationSeconds: body.durationSeconds, variants }));
  let existing = await env.AUDIO_DB.prepare(`SELECT id,status,request_hash FROM audio_generation_jobs WHERE user_id=? AND idempotency_key=?`)
    .bind(identity.userId, idempotencyKey).first();
  if (existing) {
    if (existing.request_hash !== requestHash) return respond(409, { code: 'IDEMPOTENCY_CONFLICT' });
    if (existing.status === 'succeeded') return respond(410, { code: 'RESULT_NOT_RETAINED', jobId: existing.id });
    return respond(200, { jobId: existing.id, status: existing.status, reused: true });
  }

  const quote = await env.AUDIO_DB.prepare(`SELECT id,kind,prompt_hash,duration_seconds,variants,credits_total,expires_at,status
    FROM audio_quotes WHERE id=? AND user_id=?`).bind(body.quoteId, identity.userId).first();
  if (!quote || quote.status !== 'issued' || quote.expires_at <= Math.floor(Date.now()/1000) || quote.kind !== body.kind ||
      quote.duration_seconds !== body.durationSeconds || quote.variants !== variants || quote.prompt_hash !== await hashText(prompt))
    return respond(409, { code: 'QUOTE_INVALID_OR_EXPIRED' });

  const jobId = randomId();
  try {
    const reserved = await env.AUDIO_DB.batch([
      env.AUDIO_DB.prepare(`UPDATE audio_quotes SET status='consumed',consumed_by_job_id=? WHERE id=? AND user_id=? AND status='issued' AND expires_at>?`)
        .bind(jobId, quote.id, identity.userId, Math.floor(Date.now()/1000)),
      env.AUDIO_DB.prepare(`INSERT INTO audio_generation_jobs (id,user_id,idempotency_key,kind,status,credits_reserved,request_hash)
        SELECT ?,user_id,?,?, 'reserved',credits_total,? FROM audio_quotes WHERE id=? AND status='consumed' AND consumed_by_job_id=?`)
        .bind(jobId, idempotencyKey, body.kind, requestHash, quote.id, jobId),
    ]);
    if (!reserved?.[1]?.meta?.changes) throw new CreditError('QUOTE_ALREADY_USED', 'Quote already used', 409);
  } catch (error) {
    if (env.DEBUG_ERRORS === 'true') console.error(error);
    existing = await env.AUDIO_DB.prepare(`SELECT id,status,request_hash FROM audio_generation_jobs WHERE user_id=? AND idempotency_key=?`)
      .bind(identity.userId, idempotencyKey).first();
    if (existing?.request_hash === requestHash) return existing.status === 'succeeded' ? respond(410, { code: 'RESULT_NOT_RETAINED', jobId: existing.id }) : respond(200, { jobId: existing.id, status: existing.status, reused: true });
    if (String(error?.message || error).includes('AUDIO_CREDITS_INSUFFICIENT')) return respond(402, { code: 'CREDITS_INSUFFICIENT' });
    if (error instanceof CreditError) return respond(error.status, { code: error.code });
    throw error;
  }

  await env.AUDIO_DB.prepare(`UPDATE audio_generation_jobs SET status='running',updated_at=unixepoch() WHERE id=?`).bind(jobId).run();
  const generated = [];
  try {
    for (let variant = 1; variant <= variants; variant += 1) {
      const result = body.kind === 'bgm'
        ? await generateGeminiBgm(env, {
          prompt, durationSeconds: body.durationSeconds, variant, fetchImpl: env.GEMINI_FETCH || fetch,
        })
        : await generateCloudflareSfx(env, { prompt, durationSeconds: body.durationSeconds, variant, fetchImpl: env.SFX_FETCH });
      generated.push({ variant, contentType: result.contentType, durationSeconds: body.kind === 'bgm' ? null : result.durationSeconds ?? null, audioBase64: encodeAudio(result.audio) });
    }
    await finalizeJob(env.AUDIO_DB, { verifiedBy: 'res-service-binding', userId: identity.userId }, { jobId });
    return respond(201, { jobId, status: 'succeeded', results: generated, retained: false });
  } catch (error) {
    if (error instanceof ProviderError && !error.definitive) {
      await markJobUnknown(env.AUDIO_DB, { verifiedBy: 'res-service-binding', userId: identity.userId }, { jobId }).catch(() => {});
      return respond(202, { jobId, status: 'unknown', code: error.code, message: '結果待確認；點數暫時保留，請稍後查看工作狀態。' });
    }
    await refundJob(env.AUDIO_DB, { verifiedBy: 'res-service-binding', userId: identity.userId }, { jobId, failureCode: 'generation_failed' }).catch(() => {});
    return respond(error instanceof ProviderError ? 502 : 500, { jobId, status: 'failed', code: error.code || 'GENERATION_FAILED', refunded: true });
  }
}

async function getJob(db, identity, jobId) {
  const job = await db.prepare(`SELECT id,status,kind,credits_reserved,failure_code,created_at,updated_at FROM audio_generation_jobs WHERE id=? AND user_id=?`)
    .bind(jobId, identity.userId).first();
  if (!job) return respond(404, { code: 'JOB_NOT_FOUND' });
  return respond(200, { jobId: job.id, status: job.status, kind: job.kind, creditsReserved: job.credits_reserved, failureCode: job.failure_code || null, resultRetained: false });
}

export async function handleAudioApi(request, env, authenticate) {
  const path = new URL(request.url).pathname;
  if (path === '/audio/api/health' && request.method === 'GET') return respond(200, { ok: true });
  if (!path.startsWith('/audio/api/')) return respond(404, { code: 'NOT_FOUND' });
  const writeRoute = request.method === 'POST' && ['/audio/api/quote','/audio/api/generations'].includes(path);
  if (request.method !== 'GET' && !writeRoute) return respond(405, { code: 'METHOD_NOT_ALLOWED' });
  if (request.method === 'POST') {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin && origin !== env.ALLOWED_ORIGIN) return respond(403, { code: 'ORIGIN_NOT_ALLOWED' });
  }
  let identity;
  try { identity = requireVerifiedIdentity(await authenticate(request, env)); }
  catch { return respond(401, { code: 'LOGIN_REQUIRED' }); }
  if (path === '/audio/api/me') return respond(200, { userId: identity.userId });
  if (path === '/audio/api/credits') {
    if (!env.AUDIO_DB) return respond(503, { code: 'AUDIO_DB_NOT_CONFIGURED' });
    try { return respond(200, { balance: await walletBalance(env.AUDIO_DB, { verifiedBy: 'res-service-binding', userId: identity.userId }), currency: 'RESONA_CREDITS' }); }
    catch { return respond(500, { code: 'WALLET_ERROR' }); }
  }
  if (!env.AUDIO_DB) return respond(503, { code: 'AUDIO_DB_NOT_CONFIGURED' });
  if (request.method === 'POST' && path === '/audio/api/quote') {
    const body = await request.json().catch(() => null);
    if (!validRequest(body)) return respond(400, { code: 'INVALID_QUOTE_REQUEST' });
    return createQuote(env.AUDIO_DB, identity, body, env);
  }
  if (request.method === 'POST' && path === '/audio/api/generations') return generate(request, env, identity);
  const jobMatch = path.match(/^\/audio\/api\/generations\/([a-f0-9]{32})$/i);
  if (request.method === 'GET' && jobMatch) return getJob(env.AUDIO_DB, identity, jobMatch[1]);
  return respond(404, { code: 'NOT_FOUND' });
}

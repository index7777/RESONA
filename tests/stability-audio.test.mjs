import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStabilityAudio, ProviderError } from '../worker/src/stability-audio.mjs';

const generationId = 'a'.repeat(64);

test('Stable Audio adapter submits the requested duration and polls an in-memory audio result', async () => {
  const calls = [];
  const result = await generateStabilityAudio({ STABILITY_API_KEY: 'mock-only' }, {
    kind: 'sfx', prompt: 'Distant thunder', durationSeconds: 5, variant: 1, pollDelayMs: 0,
    fetchImpl: async (input, init) => {
      calls.push({ url: String(input), init });
      if (init.method === 'POST') return Response.json({ id: generationId }, { status: 202 });
      if (calls.filter(call => call.init.method === 'GET').length === 1) return new Response(null, { status: 202 });
      return new Response(new Uint8Array([0x49, 0x44, 0x33]), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
    },
  });

  assert.equal(calls[0].url, 'https://api.stability.ai/v2beta/audio/stable-audio/text-to-audio');
  assert.equal(calls[0].init.body.get('model'), 'stable-audio-3');
  assert.equal(calls[0].init.body.get('duration'), '5');
  assert.equal(calls[0].init.body.get('output_format'), 'mp3');
  assert.match(calls[0].init.body.get('prompt'), /physically plausible/i);
  assert.equal(calls[1].url, `https://api.stability.ai/v2beta/audio/results/${generationId}`);
  assert.equal(calls[2].url, calls[1].url);
  assert.equal(result.providerJobId, generationId);
  assert.equal(result.contentType, 'audio/mpeg');
  assert.deepEqual([...new Uint8Array(result.audio)], [0x49, 0x44, 0x33]);
});

test('definitive provider rejection is distinguished from an ambiguous provider outcome', async () => {
  const env = { STABILITY_API_KEY: 'mock-only' };
  await assert.rejects(generateStabilityAudio(env, {
    kind: 'bgm', prompt: 'Boss battle', durationSeconds: 20, pollDelayMs: 0,
    fetchImpl: async () => Response.json({ message: 'invalid request' }, { status: 400 }),
  }), error => error instanceof ProviderError && error.code === 'PROVIDER_REJECTED' && error.definitive);

  await assert.rejects(generateStabilityAudio(env, {
    kind: 'bgm', prompt: 'Boss battle', durationSeconds: 20, pollDelayMs: 0,
    fetchImpl: async () => { throw new Error('simulated network disconnect'); },
  }), error => error instanceof ProviderError && error.code === 'PROVIDER_OUTCOME_UNKNOWN' && !error.definitive);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCloudflareSfx } from '../worker/src/cloudflare-sfx.mjs';

function wav() {
  const bytes = Buffer.alloc(44);
  bytes.write('RIFF', 0); bytes.write('WAVE', 8);
  return bytes;
}

test('Cloudflare SFX adapter sends a short generation request and accepts only WAV audio', async () => {
  let request;
  const result = await generateCloudflareSfx({ SFX_CONTAINER: { getByName(name) {
    assert.equal(name, 'stable-audio-small-sfx');
    return { fetch: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return new Response(wav(), { status: 200, headers: { 'content-type': 'audio/wav', 'x-generation-duration-seconds': '2.25' } });
    } };
  } } }, { prompt: 'A natural distant thunder roll', durationSeconds: 2, variant: 2 });
  assert.equal(request.url, 'https://sfx.internal/v1/generate');
  assert.deepEqual(request.body, { prompt: 'A natural distant thunder roll', durationSeconds: 2, variant: 2 });
  assert.equal(result.contentType, 'audio/wav');
  assert.equal(result.audio.byteLength, 44);
  assert.equal(result.durationSeconds, 2.25);
});

test('Cloudflare SFX adapter treats container errors as ambiguous and rejects malformed audio', async () => {
  const env = { SFX_CONTAINER: { getByName: () => ({ fetch: async () => new Response('busy', { status: 503 }) }) } };
  await assert.rejects(generateCloudflareSfx(env, { prompt: 'Thunder', durationSeconds: 2 }), error => error.code === 'PROVIDER_OUTCOME_UNKNOWN');
  await assert.rejects(generateCloudflareSfx(env, { prompt: 'Thunder', durationSeconds: 2, fetchImpl: async () => new Response('not audio', { headers: { 'content-type': 'audio/wav' } }) }), error => error.code === 'PROVIDER_BAD_AUDIO');
});

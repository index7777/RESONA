import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGeminiBgm } from '../worker/src/gemini-lyria.mjs';

test('Gemini Lyria uses the paid model, sends instrumental duration guidance, and returns MP3 bytes', async () => {
  let request;
  const bytes = Buffer.from([0x49, 0x44, 0x33, 0x01]);
  const result = await generateGeminiBgm({ GEMINI_API_KEY: 'test-key' }, {
    prompt: 'Boss battle orchestral theme', durationSeconds: 20, variant: 2,
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return Response.json({ steps: [{ type: 'model_output', content: [{ type: 'audio', data: bytes.toString('base64') }] }] });
    },
  });

  assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(request.init.headers['x-goog-api-key'], 'test-key');
  assert.equal(request.body.model, 'lyria-3.5');
  assert.match(request.body.input, /approximately 20 seconds/);
  assert.match(request.body.input, /\[0:00 - 0:04\]/);
  assert.match(request.body.input, /\[0:16 - 0:20\]/);
  assert.match(request.body.input, /do not claim a seamless loop/);
  assert.match(request.body.input, /no vocals or lyrics/);
  assert.match(request.body.input, /Take 2/);
  assert.equal(result.contentType, 'audio/mpeg');
  assert.deepEqual(Buffer.from(result.audio), bytes);
});

test('Gemini provider distinguishes definitive rejection from unknown outcomes', async () => {
  await assert.rejects(generateGeminiBgm({ GEMINI_API_KEY: 'test-key' }, {
    prompt: 'Ambient', durationSeconds: 30,
    fetchImpl: async () => Response.json({ error: 'bad request' }, { status: 400 }),
  }), error => error.code === 'PROVIDER_REJECTED' && error.definitive);

  await assert.rejects(generateGeminiBgm({ GEMINI_API_KEY: 'test-key' }, {
    prompt: 'Ambient', durationSeconds: 30, fetchImpl: async () => { throw new Error('network'); },
  }), error => error.code === 'PROVIDER_OUTCOME_UNKNOWN' && !error.definitive);
});

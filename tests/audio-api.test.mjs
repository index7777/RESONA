import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAudioApi } from '../worker/src/api.mjs';

const url = path => new Request('https://reslab.app' + path);

test('health endpoint is public', async () => {
  const r = await handleAudioApi(url('/audio/api/health'), {}, async () => { throw Error('unexpected'); });
  assert.equal(r.status, 200);
});

test('private endpoints reject missing RES authentication', async () => {
  for (const path of ['/audio/api/me', '/audio/api/credits']) {
    const r = await handleAudioApi(url(path), {}, async () => { throw Error('no session'); });
    assert.equal(r.status, 401);
  }
});

test('read-only endpoints reject writes', async () => {
  const r = await handleAudioApi(new Request('https://reslab.app/audio/api/credits', { method: 'POST' }), {}, async () => { throw Error('unexpected'); });
  assert.equal(r.status, 405);
});

test('me returns verified identity only', async () => {
  const r = await handleAudioApi(url('/audio/api/me'), {}, async () => ({ userId: 'u_abcdefgh1234' }));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { userId: 'u_abcdefgh1234' });
});

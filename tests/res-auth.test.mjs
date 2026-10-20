import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateRes } from '../worker/src/res-auth.mjs';

const req = cookie => new Request('https://reslab.app/audio/api/me', { headers: cookie ? { cookie } : {} });
const identity = { verifiedBy: 'res-service-binding', userId: 'u_test12345678' };
const env = (response, fetchCheck = () => {}) => ({
  RES_BRIDGE_KEY: 'test-only-secret',
  RES_AUTH: { fetch: async (url, init) => {
    assert.equal(new URL(url).pathname, '/internal/resona/identity');
    assert.equal(init.headers.authorization, 'Bearer test-only-secret');
    fetchCheck(init);
    return response;
  } },
});

test('missing configuration and cookie fail closed', async () => {
  await assert.rejects(authenticateRes(req('res_session=abc'), {}));
  await assert.rejects(authenticateRes(req(), env(new Response('{}'))));
});
test('forwards only RES session cookie', async () => {
  const result = await authenticateRes(req('other=private; res_session=abc; tracking=1'),
    env(Response.json(identity), init => assert.equal(init.headers.cookie, 'res_session=abc')));
  assert.deepEqual(result, { verifiedBy: 'res-service-binding', userId: identity.userId });
});
test('rejects invalid bridge response and failed verification', async () => {
  await assert.rejects(authenticateRes(req('res_session=abc'), env(new Response(null, { status: 401 }))));
  await assert.rejects(authenticateRes(req('res_session=abc'), env(Response.json({ userId: identity.userId }))));
  await assert.rejects(authenticateRes(req('res_session=abc'), env(Response.json({ ...identity, suspended: true }))));
});

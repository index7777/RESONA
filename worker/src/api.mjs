import { walletBalance } from './wallet.mjs';

const respond = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function handleAudioApi(request, env, authenticate) {
  const path = new URL(request.url).pathname;
  if (path === '/audio/api/health' && request.method === 'GET') return respond(200, { ok: true });
  if (!path.startsWith('/audio/api/')) return respond(404, { code: 'NOT_FOUND' });
  if (request.method !== 'GET') return respond(405, { code: 'METHOD_NOT_ALLOWED' });
  let identity;
  try { identity = await authenticate(request, env); }
  catch { return respond(401, { code: 'LOGIN_REQUIRED' }); }
  if (path === '/audio/api/me') return respond(200, { userId: identity.userId });
  if (path === '/audio/api/credits') {
    if (!env.AUDIO_DB) return respond(503, { code: 'AUDIO_DB_NOT_CONFIGURED' });
    try { return respond(200, { balance: await walletBalance(env.AUDIO_DB, identity), currency: 'RESONA_CREDITS' }); }
    catch { return respond(500, { code: 'WALLET_ERROR' }); }
  }
  return respond(404, { code: 'NOT_FOUND' });
}

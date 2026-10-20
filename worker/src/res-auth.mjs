import { requireVerifiedIdentity, IdentityError } from './identity.mjs';

/**
 * RESONA calls RES through a Cloudflare service binding, never a public URL.
 * The RES side MUST implement a private-only route and authenticate the
 * caller with a separate capability. Until configured, fail closed.
 */
export async function authenticateRes(request, env) {
  if (!env.RES_AUTH || !env.RES_BRIDGE_KEY) throw new IdentityError();
  const raw = request.headers.get('cookie') || '';
  const cookie = raw.split(';').map(s => s.trim()).find(s => s.startsWith('res_session='));
  if (!cookie || cookie.length > 512) throw new IdentityError();
  let response;
  try {
    response = await env.RES_AUTH.fetch('https://res-internal.invalid/internal/resona/identity', {
      method: 'GET',
      headers: { cookie, authorization: 'Bearer ' + env.RES_BRIDGE_KEY },
    });
  } catch { throw new IdentityError(); }
  if (!response.ok) throw new IdentityError();
  const body = await response.json().catch(() => null);
  // The service endpoint must independently verify both the capability and
  // the RES session; a client-controlled marker alone is not authorization.
  const verified = requireVerifiedIdentity(body);
  return { verifiedBy: 'res-service-binding', userId: verified.userId };
}

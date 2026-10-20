/**
 * RESONA identity boundary: accept only a verified RES identity from a trusted
 * server-side adapter. Never accept user IDs from request bodies or public
 * /api/auth/me JSON as authorization.
 *
 * This module does NOT introspect RES sessions or authenticate Cloudflare
 * service bindings. Those are required before enabling protected routes.
 */
export class IdentityError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'IdentityError';
    this.status = 401;
  }
}
export function requireVerifiedIdentity(identity) {
  if (!identity || identity.verifiedBy !== 'res-service-binding' ||
      typeof identity.userId !== 'string' ||
      !/^u_[A-Za-z0-9_-]{8,}$/.test(identity.userId) ||
      identity.banned === true || identity.suspended === true) {
    throw new IdentityError();
  }
  return Object.freeze({ userId: identity.userId });
}

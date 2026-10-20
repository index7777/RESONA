# RES → RESONA identity bridge: integration contract

Status: design contract only. No RES-side code, Cloudflare service binding, secrets or production deployment have been created.

## Intended RES-side endpoint

Private worker-to-worker GET /internal/resona/identity, reachable only via a configured Cloudflare service binding and a separate bearer capability. The endpoint must never be exposed on the public reslab.app route. Authenticate the caller before inspecting a session.

- Input: one res_session HttpOnly cookie forwarded from RESONA's same-origin browser request.
- Verify the bearer capability using a constant-time comparison or equivalent; rotate it through Cloudflare secrets, not source control.
- Verify the session against RES D1 via the existing sessionUser() and sessionTokenOf() functions. Reject expired/deleted sessions and banned/suspended users.
- Success: { verifiedBy: "res-service-binding", userId: "u_..." } with Cache-Control: no-store.
- Failure: 401/403 with no user details; never echo session token, email, RES credits or other profile data.
- The existing RES worker uses a custom domain and asset routing. Validate that this internal path is not publicly reachable before enabling the integration.

## Required negative tests

Missing capability; wrong capability; no cookie; malformed cookie; expired session; logged-out session; banned user; suspended user; forged userId; direct public request; worker binding unavailable; wrong Cloudflare route. Verify no positive authorization caching after logout.

## Current RESONA implementation

worker/src/res-auth.mjs expects a RES_AUTH service binding and RES_BRIDGE_KEY secret, and calls /internal/resona/identity. worker/src/index.mjs connects it to read-only /audio/api/me and /audio/api/credits. Missing bindings fail closed. Do not enable paid generation.

## Next review gate

Implement and test the RES verifier on an isolated RES feature branch based on refactor/retouch-gemini, after reading RES AGENTS.md and canonical handoff documents. The RES repository branch creation was attempted but blocked by safety checks in this session; no RES repository change occurred.

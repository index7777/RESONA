# RESONA Phase 0 — Source Audit and Integration Decisions

> 2026-10-20. Read-only source audit, not an implementation or live production test.
> REPO: `index7777/RESONA`, branch `feature/ai-audio-studio`.
> RES SOURCE: `index7777/RES`, branch `refactor/retouch-gemini`.
> Companion plan: [HANDOFF_AI_AUDIO.md](./HANDOFF_AI_AUDIO.md).

## Verified code locations and facts

| Area | Code location | Confirmed |
|---|---|---|
| RES OAuth | `RES/app/worker/src/auth-google.mjs` | Google OAuth authorization code + PKCE; session token issued after login |
| RES cookie | `auth-google.mjs` and `util.mjs` | `res_session`, HttpOnly, SameSite=Lax, Path=/, Secure on HTTPS, no explicit Domain (host-only) |
| RES session | `RES/app/worker/src/db.mjs:52-62` | random 32-byte-equivalent token; SHA-256 hash in D1; 30-day expiry; `sessionUser` joins sessions to users |
| RES identity | `RES/app/worker/schema.sql` | immutable-style internal `users.id` (`u_` prefix), unique `google_sub`; existing role, plan, credits |
| RES identity endpoint | `RES/app/worker/src/index.mjs` | `GET /api/auth/me` responds with `publicUser` including ID and image credits; this is a browser identity hint, NOT sufficient as trusted backend authorization |
| RES authorization | `index.mjs` | server checks session, banned status and other safeguards; write requests have same-origin check; AI endpoints have ticket/evidence checks |
| RES credit reserve | `RES/app/worker/src/db.mjs:87-103` | conditional decrement then **separate** ledger insert; refund uses `DB.batch` |
| RES credit schema | `RES/app/worker/schema.sql` | `users.credits`, `credit_ledger`, `receipts`; no job-scoped idempotent reservation schema |
| RES deployment | `RES/app/worker/wrangler.toml` | Worker `res` on custom domain `reslab.app`; Workers Static Assets; `run_worker_first` explicit route list |
| RESONA app entry | `RESONA/src/main.tsx` | React root wraps `App` in `BrandSite` and `I18nProvider` |
| RESONA tooling | `RESONA/package.json` | Vite + React + TypeScript, `npm run build`, `npm run render` |
| RESONA product | `RESONA/docs/PRODUCT_DIRECTION.md`, `PRODUCT_SCOPE_ROADMAP.md` | Sound IR core, reproducible render, analysis/repair, separate future Music IR; game audio initial vertical |

## Architectural implications

### Identity bridge: explicit trust boundary

The browser may send the existing host-only `res_session` cookie on same-origin `reslab.app/audio/api/*` requests, because the cookie uses `Path=/`. This **does not** mean a separately deployed RESONA Worker can validate it by itself. The raw token is opaque, and the session hash is checked against RES D1.

Recommended initial design:

1. Keep Google OAuth and session lifecycle entirely in RES.
2. Introduce a minimal authenticated identity-introspection endpoint on RES, callable **only** by a specifically bound RESONA Worker (Cloudflare service binding plus an internal authentication/authorization mechanism; validate actual supported platform behavior).
3. The RESONA API forwards the opaque session token only to the trusted RES verifier; never logs, stores, or returns it. RES verifier checks expiry, banned/suspended policy and returns minimal `{userId, role/entitlement, sessionExpiry}`.
4. RESONA uses the returned immutable RES `userId` to find/create its **separate** audio wallet. No email-based authorization, no reliance on untrusted `GET /api/auth/me` browser JSON, no copying of RES signing secrets.
5. Treat cross-Worker headers and bindings as untrusted unless the caller is actually authenticated. Validate origin/CSRF on state-changing requests, including content-type and request semantics.
6. Existing login redirect `safeNext('/audio')` appears compatible for existing members; **new** RES members currently redirect to `/app?age_check=1` for age confirmation before session issuance, so return-to-audio onboarding requires a reviewed UX handoff.
7. Ensure logout and bans invalidate subsequent audio authorization; do not cache positive introspection longer than a short bounded interval.

Alternative: short-lived audience-scoped RES-signed token with asymmetric signature, strict `aud`, `iss`, `exp`, `sub`, nonce and revocation strategy. Compare operational complexity before implementation.

**Do not expose an unauthenticated public identity introspection endpoint.**

### RES credit logic is not a drop-in financial ledger

`reserveCredits` conditionally updates `users.credits` then separately inserts `credit_ledger`. A ledger insertion failure can leave a balance decrement without a corresponding ledger entry. The current refund `DB.batch` is closer to an atomic grouped operation, but there is no job/reservation uniqueness key ensuring exactly-once settlement under retries.

RESONA must independently implement:

- A D1 schema with wallet, reservation/job state and append-only ledger; unique `(user_id, idempotency_key)` and unique `(reservation_id, event_type)` constraints as appropriate.
- Atomic debit/reservation + ledger write in a tested D1 transaction strategy, **not** a read-then-write or unprotected two-step flow. Confirm D1 batch semantics and conditional writes in integration tests.
- Deterministic state machine `quoted -> reserved/queued -> running -> succeeded/failed/refunded/unknown`; exactly-once financial transitions.
- Reconciliation for unknown provider outcomes; never retry a non-idempotent provider request blindly.
- No use of RES `users.credits`, RES `credit_ledger` or RES image-credit admin endpoint.

### Cloudflare route integration remains unproven

`reslab.app` is already configured as the RES Worker's custom domain. `/audio` cannot be assumed to dispatch to a second Worker automatically. Before any deployment, test Cloudflare-supported route specificity, service bindings and asset fallback in a nonproduction environment. Document exact Worker and domain changes plus rollback. RES `index.mjs` currently forwards most non-`/api/` routes to RES assets, so `/audio` needs an explicit route design.

### RESONA frontend integration

`src/main.tsx` currently mounts `BrandSite` around `App`; avoid replacing this bootstrap. Inspect `src/App.tsx`, `src/components/brand/BrandSite`, existing navigation and `docs/brand/` before creating audio studio pages. Keep the existing programmable sound workbench as the free local workflow; add authenticated AI SFX and BGM as distinct capabilities.

## Proposed minimal proof-of-concept (not yet implemented)

1. Read full RES `auth-google.mjs`, `db.mjs`, `index.mjs`, `security.mjs`, tests and RESONA navigation/brand components.
2. Write a tiny RES identity-verifier contract and negative tests (no cookie, expired, banned, forged caller, wrong audience).
3. In a test environment, prove a RES browser login can authorize RESONA Worker through the chosen trusted binding **without exposing the session token**.
4. Prove that a new audio wallet is initialized independently and a paid audio request cannot mutate RES image balance.
5. Prove `/audio` route and static asset loading without interfering with `/`, `/app`, `/api/auth/*`.
6. Only after this POC, add UI, provider integration and pricing.

## Decisions still needed

- Identity bridge: service-binding introspection vs signed short-lived audio token (recommend evaluating service binding first).
- Cloudflare path routing and preview environment.
- RESONA initial Audio Credits policy, pricing and provider selection.
- Existing RESONA visual assets and which parts of the CI should change.
- User onboarding when RES age confirmation is pending.

## Evidence and scope limitations

- All findings above derive from GitHub source read on 2026-10-20; no live Cloudflare environment, Google OAuth browser session, D1 migration, production billing or test suite was executed.
- No code, database, deployment or RES repo files were modified by this audit.
- Do not treat source review as a security certification or a claim of production readiness.

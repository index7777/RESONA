# RESONA — AI BGM / SFX Integration Handoff

> Status: PLANNING ONLY. Created 2026-10-20 on `feature/ai-audio-studio`. No application, RES, database, production route, or billing implementation is claimed complete.
> Authoritative implementation branch: `index7777/RESONA:feature/ai-audio-studio`. Do not commit this work to `main` without explicit approval.
> RES integration reference: `index7777/RES:refactor/retouch-gemini` (not RES `main`).

## 1. Decisions and boundaries

- Product and brand: **RESONA** (not NOCTAVE). BGM and SFX are new product workflows inside the existing RESONA programmable audio system.
- Repository: `index7777/RESONA`; development branch `feature/ai-audio-studio`. Keep existing RESONA source, synth, IR v3, render and WAV export working.
- Desired public entry: `https://reslab.app/audio`, subject to Cloudflare routing and deployment verification. No DNS/route change has been made.
- Membership: reuse RES Google login and identity; users should not register a separate RESONA account.
- Credits: **RESONA Audio Credits are entirely separate from RES image Credits**. No cross-spend, conversion, shared balance or implicit RES-credit grants. Local/browser DSP generation remains free; charge only for explicitly priced paid remote generation.
- Brand CI (Corporate Identity): RESONA-specific identity, distinct from RES visual identity. Existing RESONA assets and `docs/brand/` must be audited before redesign; no wholesale replacement.
- CI/CD: build/test/deploy checks scoped to RESONA, with no unrequested changes to RES CI.
- No live payment provider, audio provider, prices, signup bonuses or subscription plan has yet been selected or approved.

## 2. Verified repository baseline

### RESONA

- `package.json`: React + Vite + TypeScript, version 0.2.0; scripts `dev`, `build`, `preview`, `render`.
- `README.md`: browser-first programmable sound studio; Web Audio synthesis, one-shot SFX, WAV export, deterministic JSON programs; IR v3 physical engines and Node batch render.
- `docs/PRODUCT_DIRECTION.md`: Sound IR is central; prompt is one frontend; deterministic render, analysis, repair, verification, source traceability.
- `docs/PRODUCT_SCOPE_ROADMAP.md`: game audio is first vertical, not permanent limit; SFX families and future separate Music IR, stems, loops, adaptive music. Do not collapse product into prompt-to-WAV or force music into Sound IR.
- Existing `src/`, `public/`, `docs/brand/` and website content must be inspected before code changes.

### RES — correct branch only

- `app/worker/README.md`: production architecture is Cloudflare Worker + D1, not Supabase; domain `reslab.app`.
- `app/worker/src/auth-google.mjs`: Google OAuth authorization code + PKCE; RES-managed sessions.
- `app/worker/src/ai-routes.mjs`: existing AI proxy and RES image-credit debit/refund flows.
- `app/worker/schema.sql`: `users` with `credits`, `sessions`, `credit_ledger`, receipts and other operational tables.
- `app/worker/wrangler.toml`: Cloudflare configuration, worker-first routing and quotas.
- `app/docs/COST_AND_CREDITS.md`: existing RES trial uses 45 initial RES credits, up to 10 standard users, roles and cost settings. **These RES rules must not be copied automatically into RESONA.**
- `app/docs/GOOGLE_LOGIN_SETUP.md` is explicitly historical; do not implement a Supabase Auth dependency based on it.
- Before implementation, inspect source code for exact session cookie scope, validation, CSRF protections, token lifecycle, user-ID semantics and D1 transaction behavior. Documentation alone does not prove runtime correctness.

## 3. Target architecture

```text
reslab.app
  /app         -> existing RES Worker and image editing (unchanged)
  /audio       -> RESONA web UI (separate deployment/Worker where practical)
  /audio/api/* -> RESONA authenticated API

RES Google OAuth / RES session
       |
       +-- trusted identity bridge (short-lived audience-scoped token or
       |   protected server-to-server session introspection; exact design TBD)
       v
RESONA Worker API
       |-- Audio D1 (own database, own migrations)
       |    |-- audio_members (RES stable user ID mapping)
       |    |-- audio_wallets
       |    |-- audio_credit_ledger (append-only)
       |    |-- audio_credit_reservations
       |    |-- audio_generation_jobs
       |    |-- audio_assets
       |    |-- audio_pricing_rules
       |    +-- optional orders / payment events later
       |-- R2 (private generated assets + metadata)
       |-- Queue/worker (asynchronous provider calls, retries)
       |-- Gemini (intent parsing / prompt or structured IR generation)
       +-- approved SFX/BGM providers (audio generation)
```

Deployment note: Verify Cloudflare custom-domain ownership, route specificity and `run_worker_first` behavior. RES Worker currently owns `reslab.app`; do not assume that adding a second Worker automatically makes `/audio` work. Choose a tested route/service binding/dispatch arrangement before deployment. Do not copy RES Google OAuth secrets, RES session signing keys or image wallet credentials into RESONA. Prefer a narrowly scoped identity bridge with stable immutable RES user IDs, expiry, audience validation, revocation strategy and replay protections.

## 4. Credit and payment invariants

1. RES `users.credits` and RES `credit_ledger` remain untouched by audio requests.
2. RESONA owns a separate Audio D1 and append-only audio ledger; each wallet is keyed by the authenticated RES user ID, never by a caller-supplied ID.
3. Pricing is calculated and enforced server-side from versioned rules (provider, model, requested seconds, quality, output count). UI quotes are informative and expire.
4. On generation: validate identity/entitlement/rate limit, check wallet and reserve credits **atomically**, then enqueue exactly one idempotent job. Insufficient funds must not call the paid provider.
5. On success: finalize reservation once and persist the asset; on definitive failure/cancellation: release or refund once. Handle provider timeouts/unknown outcomes via reconciliation rather than blindly retrying and double-charging.
6. Use unique idempotency keys, unique provider event IDs and database constraints; verify concurrency, retry and webhook replay behavior with tests.
7. Never trust browser-supplied balances, costs, completion flags, admin roles or payment success.
8. Audio trial grants and point packages require explicit business approval; do not reuse RES 45-credit onboarding or invent monetary value.
9. If payments are added: server-created orders, signed webhook verification, one-time credit grant, refunds/chargebacks and audit trail. Payment provider undecided.
10. Record internal estimated provider cost separately from user-facing credits; monitor spend caps and abuse.

## 5. Product workflows

### Free local SFX
- Keep RESONA Sound IR v3, DSP render, live preview, WAV export and deterministic seeds functional without login/payment when possible.
- Preserve reproducible source programs and analysis/validation evidence.
- Natural language to editable Sound IR can be local/free only if it truly avoids a paid remote model; remote Gemini calls require an explicit pricing decision.

### Paid AI SFX
- Prompt or game-audio specification -> Gemini structured intent -> choose between existing RESONA IR renderer and licensed external audio model.
- Where possible, produce editable IR and variations; for external audio return honest provenance and avoid falsely claiming deterministic IR reproduction.
- Generate preview and metadata, validate measurable properties (duration, peak, clipping, loop boundaries), store asset in private R2, expose authorized download.
- Support coherent asset families and controlled variations over time.

### Paid AI BGM
- Separate `Music IR` for tempo/key/meter/sections/tracks/loop points/intensity; do not misuse Sound IR as music composition.
- MVP may use a vetted external music provider, but label opaque audio as provider-generated and avoid pretending it is editable Music IR.
- Confirm provider API access, pricing, output length, commercial/game redistribution license and retention rules before committing.
- Long-term: loop-safe sections, stems, transitions and adaptive game music; do not promise exact duration or seamless looping from prompt alone.

### Out of scope for first implementation
- Singing/RESONA Voice model, subscriptions, credit transfer, live adaptive runtime, full DAW, and unverified third-party APIs.

## 6. API proposal (subject to code inspection)

- `GET /audio/api/me` -> authenticated RES member identity + RESONA entitlement.
- `GET /audio/api/credits` -> Audio balance, reserved balance.
- `POST /audio/api/quote` -> server-calculated signed/expiring quote.
- `POST /audio/api/generations` -> idempotent reservation and job creation.
- `GET /audio/api/generations/:id` -> owner-scoped job state.
- `GET /audio/api/assets` -> owner-scoped library.
- `GET /audio/api/assets/:id/download` -> short-lived authorized R2 URL.
- `GET /audio/api/ledger` -> paginated credit history.
- Future `POST /audio/api/orders` and signed payment webhook only after payment choice.

All APIs must validate the RES-issued identity on the server, authorize asset ownership, rate-limit costly operations, and avoid exposing provider API keys.

## 7. RESONA brand CI plan

- **Name:** RESONA. Product label: `RESONA Audio Studio`; BGM and SFX are separate workspaces, not separate companies.
- Review existing logo, imagery, typography, colors, `docs/brand/` and page layout before editing.
- Establish brand tokens for background/surface/text/accent/success/warning/error; typography scale; spacing; component radii; waveform/spectrum/timeline graphics; iconography; dark/light/accessibility contrast.
- Preserve RESONA's programmable engineering positioning. Avoid generic neon-AI branding, deceptive 'one-click perfect music' claims and unnecessary conflict with RES's existing visual identity.
- Design states: signed out, free local mode, quote, insufficient Audio Credits, queued/running, completed, failed/refunded, private library and download.
- Deliver brand spec, responsive Figma-equivalent design tokens/components in code, and BGM/SFX UI mockups; review before changing existing visual assets.

## 8. Suggested repository modules (not yet created)

```text
src/                         # keep existing RESONA audio engine
src/features/audio-studio/   # BGM/SFX UI, account, credit, library
src/lib/audio-api/           # typed client
worker/                      # RESONA Cloudflare API, identity bridge
worker/migrations/           # Audio D1 only
worker/queues/               # async jobs
worker/providers/            # Gemini / licensed audio providers
tests/audio/                 # auth, ledger, concurrency, jobs, regressions
docs/HANDOFF_AI_AUDIO.md     # this document
docs/brand/                  # existing brand references + future CI spec
```

Do not adopt these paths blindly: inspect current source tree and module conventions first.

## 9. Phased implementation / acceptance gates

### Phase 0 — Discovery and contracts
- Audit RESONA app architecture, brand assets, build, tests and deployment.
- Audit RES branch source: Google session validation, D1 ledger atomicity, routes and Cloudflare bindings.
- Decide trusted identity bridge and Cloudflare `/audio` routing with a proof of concept.
- Select approved SFX/BGM providers and confirm licenses/cost model.
- **Gate:** reviewed architecture/sequence diagram, threat model, cost sheet and no RES regression.

### Phase 1 — RESONA UI and local foundation
- Introduce BGM/SFX navigation and RESONA design tokens while preserving current Sound Lab/IR tools.
- Implement free local SFX flow, responsive preview and WAV export.
- **Gate:** existing build/render smoke tests pass, local rendering remains free.

### Phase 2 — Identity and independent credits
- Implement RES-to-RESONA login bridge and Audio D1 migrations.
- Implement server-side quote, wallet, immutable ledger, atomic reservation, refunds and admin audit.
- **Gate:** tests prove RES image balance unchanged, cross-user isolation, concurrency safety, idempotency and no paid provider call on insufficient funds.

### Phase 3 — Paid SFX pipeline
- Queue + provider adapter + R2 + owner-scoped assets/download.
- Include cancellation/failure reconciliation, limits, measurable audio validation.
- **Gate:** provider sandbox E2E, exactly-once credit settlement and refund tests.

### Phase 4 — BGM and music foundation
- Separate Music IR design and initial BGM provider integration, duration/loop post-processing, licensing display.
- **Gate:** verified provider license, real audio quality review, cost controls, no false editability claims.

### Phase 5 — Production readiness
- Add RES navigation entry and deploy RESONA to tested `reslab.app/audio` route.
- Configure secrets per environment, D1 migrations, R2, queues, observability, rate limits, privacy/terms.
- Add branch-scoped CI checks and preview deployments; require review before production.
- **Gate:** smoke-test OAuth handoff, wallet isolation, paid generation, downloads, refund path, rollback.

## 10. CI/CD and change safety

- Run `npm run build` and `npm run render` representative fixtures on RESONA branch; add tests before relying on automation.
- Test sound-program compatibility (v2/v3), deterministic output where applicable, WAV integrity, and asset metadata.
- Test security and financial failure modes: unauthenticated calls, token audience mismatch, CSRF/session abuse, wrong-user asset access, parallel requests, retries, webhook replay, refunds.
- Preview deployment should use nonproduction D1/R2, provider sandbox and nonproduction credit grants.
- Do not merge into `main`, deploy to `reslab.app`, migrate production D1 or change RES auth without explicit authorization.
- Preserve RES `refactor/retouch-gemini` image editing invariants and verification requirements.

## 11. Open decisions before paid launch

1. Confirm current RESONA brand assets and desired visual direction (retain vs redesign).
2. Confirm how RESONA users are entitled during RES's 10-user trial limit.
3. Choose SFX and BGM providers based on actual API availability, licenses and cost.
4. Approve Audio Credits pricing, signup grant, expiry/refund policy, usage caps and payment provider.
5. Choose identity bridge and domain route after validating Cloudflare behavior.
6. Decide whether remote Gemini-assisted IR generation is paid, free within quota, or disabled for MVP.

## 12. Next action

Begin Phase 0 with **read-only source inspection**. Produce exact integration points and tests before modifying runtime code. This document is a handoff plan, not evidence that implementation is complete.

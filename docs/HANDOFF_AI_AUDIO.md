# RESONA — AI BGM / SFX Integration Handoff

> Status: IMPLEMENTATION IN PROGRESS on `feature/ai-audio-studio`. See the latest dated Cloudflare checkpoint at the end of this file; older checkpoints below are historical. An isolated RES identity bridge is deployed without public URLs/routes. The RESONA Audio Worker build has not succeeded, no `/audio` route is active, and paid generation remains disabled.
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
       |    |-- audio_pricing_rules
       |    +-- optional orders / payment events later
       |-- Browser session memory (generated audio preview/download; never persisted by RESONA)
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
5. On success: finalize reservation once and return audio to the browser for in-session preview/download only; never persist generated audio. The prompt is sent to the selected generation provider. On definitive failure/cancellation: release or refund once. Handle provider timeouts/unknown outcomes via reconciliation rather than blindly retrying and double-charging.
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
- Generate audio and return it to browser memory for preview and local download; do not store audio or expose a server-side asset library/download route.
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
- `POST /audio/api/generations` -> generated audio payload delivered to the authenticated browser session; no persistent audio asset endpoint.
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
- Provider adapter + browser-session preview/download; no server-side audio persistence.
- Include cancellation/failure reconciliation, limits, measurable audio validation.
- **Gate:** provider sandbox E2E, exactly-once credit settlement and refund tests.

### Phase 4 — BGM and music foundation
- Separate Music IR design and initial BGM provider integration, duration/loop post-processing, licensing display.
- **Gate:** verified provider license, real audio quality review, cost controls, no false editability claims.

### Phase 5 — Production readiness
- Add RES navigation entry and deploy RESONA to tested `reslab.app/audio` route.
- Configure secrets per environment, D1 migrations, queues if needed, observability, rate limits, privacy/terms. Do not add persistent generated-audio storage.
- Add branch-scoped CI checks and preview deployments; require review before production.
- **Gate:** smoke-test OAuth handoff, wallet isolation, paid generation, downloads, refund path, rollback.

## 10. CI/CD and change safety

- Run `npm run build` and `npm run render` representative fixtures on RESONA branch; add tests before relying on automation.
- Test sound-program compatibility (v2/v3), deterministic output where applicable, WAV integrity, and asset metadata.
- Test security and financial failure modes: unauthenticated calls, token audience mismatch, CSRF/session abuse, wrong-user asset access, parallel requests, retries, webhook replay, refunds.
- Preview deployment should use nonproduction D1, provider sandbox and nonproduction credit grants; generated audio remains browser-session-only.
- Do not merge into `main`, deploy to `reslab.app`, migrate production D1 or change RES auth without explicit authorization.
- Preserve RES `refactor/retouch-gemini` image editing invariants and verification requirements.

## 11. Open decisions before paid launch

1. Confirm current RESONA brand assets and desired visual direction (retain vs redesign).
2. Confirm how RESONA users are entitled during RES's 10-user trial limit.
3. Gemini Lyria 3.5 is the recommended primary BGM provider; see [Gemini provider and pricing analysis](GEMINI_AUDIO_PROVIDER_PRICING.md). SFX still requires a provider that can meet natural-sound quality and honest duration reporting.
4. Approve Audio Credits pricing, signup grant, expiry/refund policy, usage caps and payment provider.
5. Choose identity bridge and domain route after validating Cloudflare behavior.
6. Decide whether remote Gemini-assisted IR generation is paid, free within quota, or disabled for MVP.

## 12. Next action

Begin Phase 0 with **read-only source inspection**. Produce exact integration points and tests before modifying runtime code. This document is a handoff plan, not evidence that implementation is complete.

## Current Cloudflare handoff — 2026-10-21

This checkpoint supersedes earlier dated statements below that said no identity bridge had been deployed. The detailed operator runbook is [CLOUDFLARE_REMOTE_SFX_DEPLOY.md](CLOUDFLARE_REMOTE_SFX_DEPLOY.md); manual product review steps are in [MANUAL_QA_HANDOFF.md](MANUAL_QA_HANDOFF.md).

### Completed

- RESONA is on `feature/ai-audio-studio`; branch tip before this handoff update was `b5aebcc` (`Prepare RESONA audio preview`). The Cloudflare build project targets this branch, not `main`.
- Cloudflare has an isolated `resona-audio-preview` D1 (`19ece3dd-79b5-42e0-8192-fc146ec732bb`) with Audio-only schema, plus a separate `res-identity-preview` D1 (`e9cd4d92-27a9-40c4-ac9e-119b3d1ccfd2`). No production RES data was copied.
- RES branch `feature/resona-auth-bridge` contains commits `d4dee19` (constant-time capability comparison and tests) and `e28703a` (isolated preview D1 Wrangler configuration). The private `res-auth-bridge-preview` Worker was deployed as version `7f5db535-c57d-4d05-89c1-a4d6b8b16737`; it has no Workers.dev hostname, Preview URL, custom domain, or route. Its bridge secret is configured as a Cloudflare secret and is not recorded here.
- Cloudflare Workers Builds project `resona-audio-preview` points at `index7777/RESONA`, root `/`, build command `npm ci && npm run build`, deploy command `npm run deploy:audio-preview`, and production branch `feature/ai-audio-studio`. Builds do not require Docker on the developer machine.
- Latest previously reported QA: RES bridge tests passed 4/4; RESONA audio tests passed 25/25, frontend build passed, and reference render generated all 24 programs. These are historical results from 2026-10-20/21, not a fresh run for this documentation commit.

### Current blockers and uncompleted work

1. GitHub sudo re-authentication has been completed by the account owner. With explicit user approval, `index7777/RESONA` was added to the Cloudflare Workers and Pages GitHub App's selected repositories; `50cut` remains selected and All repositories was not enabled. Cloudflare no longer shows the project as disconnected.
2. The first Cloudflare Build on `feature/ai-audio-studio` (`0b2c2122-0a46-43ac-8b58-5668038f5289`) cloned successfully, installed dependencies and built the frontend, then failed at remote Container image build because `build_context` was repo root and `COPY app.py` could not find `worker/sfx-inference/app.py`.
3. `wrangler.toml` now sets the Preview Container `build_context` to `./worker/sfx-inference`; push this fix to trigger another Cloudflare Build and confirm image build/deploy. Local Windows Docker is not required.
4. Once the audio Worker exists, set its `RES_BRIDGE_KEY` Cloudflare secret to the same capability as the bridge's `RESONA_BRIDGE_KEY` using the encrypted local recovery copy. Never print or commit the value. Verify `AUDIO_DB` and `RES_AUTH` bindings resolve only to the two preview resources.
5. Keep `workers.dev`, preview URLs, custom domains, and routes disabled while validating auth, bridge revocation/suspension behavior, D1 semantics, Container cold start, health checks, and cost. Configure HF model access only after gated access and license review; keep both generation flags false until provider, rights, pricing, and settlement/refund QA is approved.
6. Production remains unfinished: no `/audio` route under `reslab.app` has been configured. The existing `res` Worker owns `reslab.app`; route ownership/dispatch and preservation of `/app`, asset paths, OAuth return, cookies, and `/audio/api/*` worker-first behavior require a tested RES-side change and isolated preview QA before any production route is considered.

### Safety boundaries

- Do not deploy to or edit the production `res` Worker, change `reslab.app` routes, merge to either repository's `main`, enable paid generation, or migrate production data as part of this handoff.
- Do not use a local Docker daemon. Cloudflare Workers Builds is the intended remote Container image build path.
- The exact current Cloudflare configuration, first failed build, account re-auth step, and operator sequence are maintained in [CLOUDFLARE_REMOTE_SFX_DEPLOY.md](CLOUDFLARE_REMOTE_SFX_DEPLOY.md).

## Initial implementation checkpoint — 2026-10-20

- Added `worker/migrations/0001_audio_wallet.sql`: separate wallet/job/ledger tables and atomic reservation triggers. No production migration run.
- Added `worker/src/identity.mjs` and `worker/src/wallet.mjs`: verified identity boundary and reservation prototype; no settlement/refund implementation.
- Added `worker/src/api.mjs` and `worker/src/index.mjs`: read-only health, identity and wallet endpoints. **Production entrypoint deliberately fails closed** until the RES trusted verifier exists.
- Added `tests/audio-wallet.test.mjs` and `tests/audio-api.test.mjs`: source-level unit tests; **not executed**.
- At this initial checkpoint, the next blocking task was to review RES AGENTS.md and implement a private RES service-binding verifier. The follow-up checkpoint below supersedes that task status.
- RES `main`, RES image credits, RESONA `main`, production Cloudflare configuration and live databases remain untouched.

## Implementation checkpoint — 2026-10-20 (follow-up)

- RES `feature/resona-auth-bridge` now has local-only fixed-time bearer comparison and isolated identity Worker tests. The code is not deployed; preview Google login and Cloudflare bindings remain unverified.
- RESONA's `/audio/api/*` boundary re-validates adapter output with `requireVerifiedIdentity`, including a regression test for a forged adapter `userId`.
- `worker/migrations/0002_audio_settlement.sql` adds a guarded job-state transition and atomically refunds credits plus appends a ledger record on definitive failure. Unknown provider results stay reserved until reconciliation.
- Audio wallet tests run the real SQL migrations in a separate in-memory SQLite database and cover reservation, retries, conflicts, parallel overspend, success settlement, refund-once, unknown outcomes, and ledger-trigger rollback. This is not a remote Cloudflare D1 test.
- Wrangler 4.151.2 is a development dependency and current Wrangler authorization successfully reached the Cloudflare account. A separate `resona-audio-preview` D1 exists; no credential was written to the repository. No Worker deployment or public route is active.
- Wrangler OAuth was subsequently authorized for the configured Cloudflare account. The account's pre-existing `res` database was inspected but left untouched.
- Created a separate Cloudflare D1 database, `resona-audio-preview` (`19ece3dd-79b5-42e0-8192-fc146ec732bb`), and added `wrangler.toml` bindings under `env.preview`. Applied and remotely verified both Audio-only migrations; tables are `audio_wallets`, `audio_generation_jobs`, and `audio_credit_ledger` plus D1 internals. No production data was migrated.
- The preview Worker itself is not deployed. `env.preview` is deliberately configured without a public Workers.dev endpoint or domain route and references the isolated service binding `res-auth-bridge-preview`; that RES bridge preview Worker does not yet exist in this Cloudflare account. This prevents accidentally binding to production RES.
- Added a versioned quote flow and generation API: `/audio/api/quote`, `/audio/api/generations`, and `/audio/api/generations/:id`. Audio is returned for the active browser session only; there is no persistent asset library or download route. Quotes are user-bound, expire in five minutes, and can be consumed only once; pricing is server-side, duration-aware, and refuses to run until explicit per-10-second Audio Credit prices are configured.
- Added a Stable Audio 3 adapter for both SFX and BGM with natural/physical SFX prompting, provider polling, one or two separately labeled variations delivered to the current browser session, idempotent reservation, settlement, and definitive-failure refund. Generated audio is not persisted. Ambiguous provider outcomes remain reserved for reconciliation; generation remains disabled by default.
- Added a lazily loaded, zh-TW/English localized AI Audio Studio panel to the existing Sound Lab. It supports SFX/BGM, requested duration, V1/V2, credit display/quote, generation, playback and download; it preserves the existing local DSP workflow and warns that BGM loop points are not guaranteed.
- Added `0003_audio_generation_assets.sql` remotely to the isolated D1. Confirmed `audio_assets` held zero rows, then applied `0004_remove_audio_asset_storage.sql` remotely; the preview database now retains no asset index. Removed the R2 binding. `AUDIO_GENERATION_ENABLED=false`.
- Official provider research indicates Stable Audio 3 is a candidate, not an approved production choice: the [API schema](https://platform.stability.ai/docs/api-reference) specifies 1–380 seconds and an 8-credit generation, while the [pricing page](https://platform.stability.ai/pricing) currently lists 26 credits for Stable Audio 3.0. Treat provider cost as unresolved until Stability confirms the applicable API rate. The [Terms of Service](https://platform.stability.ai/legal/terms-of-service) assign output rights between Stability and its API customer subject to applicable law and terms; this does not automatically assign rights from RESONA to each end user, nor guarantee copyrightability or non-infringement. RESONA's end-user terms must explicitly reflect the requested user-rights policy before enabling paid generation. Prompts are transmitted to Stability for processing. The account's registration/eligibility and end-user terms require review. The provider API key is not configured in this environment.
- User direction on 2026-10-20: make Gemini the primary approach, then analyze pricing. The official Gemini research and direct-cost analysis are documented in [GEMINI_AUDIO_PROVIDER_PRICING.md](GEMINI_AUDIO_PROVIDER_PRICING.md). Lyria 3.5 is recommended for BGM at USD 0.08 per request (no free tier); Lyria 3 Clip Preview is USD 0.04 per request but always generates 30 seconds. These are provider costs, not approved Audio Credit tariffs. Lyria models are music generators and do not promise exact-duration SFX; the existing per-10-second quote formula must be replaced with a versioned per-model/per-request rate card before Gemini is enabled. Use paid quota for production; Google states unpaid prompts and responses can be used to improve products, while paid usage can retain prompts/output for abuse monitoring. RESONA still does not persist generated audio, but prompts/results are processed by Google and the Worker.
- ElevenLabs was checked as the dedicated SFX candidate. Its endpoint supports 0.5–30-second sound effects, but public billing references differ and public Sound Effects terms restrict distribution as isolated audio files. That may conflict with RESONA's promised standalone preview/download, so it is not approved for integration without written confirmation of rights and API pricing.
- Free SFX provider check: Freesound is an existing-sound library, not generative AI. Its free API is limited to non-commercial use; commercial API access must be negotiated with UPF. Its sounds remain governed by item-specific CC licenses, so it cannot promise that each generated/downloaded sound is owned by the RESONA user. No free hosted generative SFX API is currently approved. See [Gemini provider and pricing analysis](GEMINI_AUDIO_PROVIDER_PRICING.md).
- Implemented Gemini Lyria 3.5 for BGM; SFX remains behind a separate explicit feature flag pending provider approval. BGM quotes use USD 0.08 per requested variant multiplied by `AUDIO_BGM_COST_MULTIPLIER` (preview config 2.0, 50% model-cost-only gross margin) and then convert to Audio Credits using `AUDIO_CREDIT_VALUE_USD`. The latter is unset, so quotes fail closed; generation remains disabled. Gemini output duration is reported from browser metadata rather than echoing the requested target. `tests/gemini-lyria.test.mjs` and the API integration test cover the provider request, price calculation, per-variant calls, and no persistent audio storage.
- No R2 bucket is required or configured. The RES identity bridge preview Worker does not yet exist in this account. No Worker or public route has been deployed.
- Worker packaging has passed Wrangler's preview dry-run. A preview deployment was attempted and Cloudflare rejected it because the bound service `res-auth-bridge-preview` does not exist yet; no Worker deployment or route was created. Paid generation remains off.
- Remaining live acceptance gates for stage 8: deploy the RES identity bridge against a test-only identity database and validate Google OAuth/suspension; add the provider secret; confirm license/attribution eligibility and the provider's actual API pricing; document the user-rights transfer in RESONA terms; approve the Audio Credit rate and a way for test users to receive preview credits. Until then, paid generation stays disabled and no production route is configured.
- Verification after these additions: 16 Node tests pass, `npm run build` passes, and `git diff --check` passes. Wrangler emits a non-fatal local log-file permission warning under the user's AppData roaming directory; authenticated D1 API calls still succeeded.

## BGM-first and self-hosted SFX research checkpoint — 2026-10-20

- User direction: analyze self-hosted open SFX models and complete BGM first.
- BGM UI now opens on BGM by default. Gemini Lyria prompt assembly now adds timestamp-guided intro/development/ending sections derived from the selected duration and asks for a restart-friendly ending. These timestamps are creative guidance only; the API's actual audio duration remains measured in the browser, and seamless looping is not promised.
- User clarified deployment target: SFX inference should run on Cloudflare, not be installed on the local Windows machine.
- Added an isolated Cloudflare Durable Object Container proof-of-concept using the Stable Audio 3 Small-SFX CPU model. The preview Container is configured as `standard-4` (4 vCPU/12 GiB), model weights are fetched at runtime only with an HF token, generated WAV is serialized in memory, and an idle timeout lets the Container scale down. The main RESONA Worker is the only intended caller; `AUDIO_GENERATION_ENABLED` and `AUDIO_SFX_GENERATION_ENABLED` remain false.
- The first implementation uses the vendor Python CPU API (not the separately optimized TFLite build) to keep the model loaded during a warm container. Measure cold start, generation latency, RAM, duration, and quality before choosing whether to switch to TFLite or production sizing.
- No weights were downloaded, no HF token was added, and no Worker/Container was deployed. Deployment requires review of gated model access and licensing, a Workers Paid plan/Container availability, Docker image build, and measured spending. Generated user audio is not written to disk or R2.
- Added mocked tests for the Cloudflare SFX adapter and audio validation. Full audio tests pass (25), frontend build passes, and Python syntax compilation passes. Wrangler preview dry-run could not complete in this workspace because the bundler was denied access to a parent directory (`../../..`) and Wrangler's log path under AppData was permission denied; no deployment was attempted.
- Container setup/pricing/model details are recorded in `GEMINI_AUDIO_PROVIDER_PRICING.md`.
- Updated candidate/rights/POC analysis is in `GEMINI_AUDIO_PROVIDER_PRICING.md`.

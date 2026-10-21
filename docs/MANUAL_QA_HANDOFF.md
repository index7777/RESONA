# RESONA manual QA handoff

Status: **ready for local product and interaction review** on `feature/ai-audio-studio`. Production credentials, real AI generation and public routing remain disabled.

## Start the review build

From the repository root:

```bash
npm ci
npm run dev
```

Open the `/audio/` URL printed by Vite. To review the AI Audio Studio interactions without a RES session or provider setup, append `?audioDemo=1`.

The local demo mode is compiled only for Vite development. It skips all `/audio/api/*` requests, uses a temporary in-memory balance, generates synthetic 3.5-second mono WAV samples in the browser and revokes its object URLs when the panel is closed or changed. The prominent notice explains that this is UI test audio, not AI output. Never use demo audio to assess sound quality or provider performance.

## Human review checklist

- Check the existing Sound Lab and Music Lab still load and switch correctly.
- Open AI Audio Studio. Confirm the local demo notice and temporary balance are visible.
- Switch between SFX and BGM; check the prompt, duration bounds and BGM-only guidance update.
- Change the prompt and variation count, generate one and two variants, and confirm the temporary balance and quote update.
- Play each result and confirm the measured 3.5-second duration is shown.
- Use each download link and confirm a playable WAV is downloaded.
- Switch language to English and verify the demo notice, status and controls remain understandable.
- Resize to a narrow/mobile viewport and check that controls and result cards remain usable without horizontal scrolling.
- Remove `?audioDemo=1` and reload. In an environment without the RES service binding, the account should show as unavailable and generation must stay disabled.

## Automated and package checks

```bash
npm run test:audio
npm run build
npm run render -- --library
npx wrangler deploy --dry-run --env preview
```

`npm run build` emits the Vite app under `dist/audio/`, matching the intended `/audio/` path. Wrangler serves those assets from `dist` and sends only `/audio/api/*` through the Worker script. The dry run is packaging validation only; it does not create a Worker deployment or public route.

Local verification completed on 2026-10-20: `npm run test:audio` passed 25/25; `npm run build` passed; and `npm run render -- --library` rendered all 24 reference programs. A Wrangler package dry run using a temporary config without the Container image build block succeeded: it packaged the Worker, D1 and service bindings, and `/audio/` assets. The normal local deploy dry run reads the Container Dockerfile and asks for Docker; the intended Cloudflare Workers Builds flow builds that image remotely and needs no local Docker. **Update 2026-10-21:** a private RES identity bridge has since been deployed to an isolated D1; GitHub account re-authentication and selected-repository access are now complete. The RESONA Audio Worker still needs a fresh successful Cloudflare build; there is no public route. See [CLOUDFLARE_REMOTE_SFX_DEPLOY.md](CLOUDFLARE_REMOTE_SFX_DEPLOY.md) for live state and remaining acceptance gates.

The wallet integration tests execute the actual SQL migrations against independent in-memory SQLite and exercise trigger rollback/concurrency. They do not prove Cloudflare D1 transaction semantics; run that acceptance against the isolated D1 before enabling paid generation.

## Target deployment under RES

The intended final URL is `https://reslab.app/audio/`. This repository alone cannot install that route: RES currently owns the `reslab.app` custom domain, so its Worker must explicitly serve or forward `/audio/*` while preserving `/audio/api/*` Worker-first handling, static asset paths and the existing app routes. The RES repository is not present in this workspace, so no route change has been made here. Validate the same path on an isolated preview hostname, then make the RES Worker routing change and verify OAuth return, session cookie forwarding, assets and API responses before enabling generation.

## Requires Cloudflare owner/operator QA

- Create and deploy the private RES identity bridge against an isolated test identity database. Verify no public introspection route, no-cookie and expired-session rejection, logout revocation, and banned/suspended rejection.
- Confirm the RESONA preview service binding resolves to that bridge and the Audio D1 remains isolated from RES image Credits.
- Validate the final RES domain route at `https://reslab.app/audio/` and `/audio/api/*`, asset caching, OAuth return path, cookie forwarding and API worker-first behavior on an isolated preview hostname first; then promote the same path integration to the RES domain.
- Review Gemini/SFX provider access, terms, attribution and actual costs. Configure secrets and Audio Credit value only after approval.
- Keep `AUDIO_GENERATION_ENABLED` and `AUDIO_SFX_GENERATION_ENABLED` false until real provider, ledger settlement/refund and permission checks pass.
- Listen to real provider outputs and assess SFX/BGM quality, duration, variation distinction, licensing language and download behavior. Synthetic local demo audio is not acceptable evidence for this review.

No production route, Worker deployment, generation flag, RES image-credit migration or public login bridge is part of this handoff.

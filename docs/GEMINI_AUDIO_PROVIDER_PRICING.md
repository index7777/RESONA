# RESONA Gemini Audio Provider & Pricing Analysis

Updated: 2026-10-20
Status: provider recommendation and cost analysis; not an approved customer tariff.

## Recommendation

- Treat “Gemini” as two distinct roles, not one audio service: a Gemini text model can interpret a request and draft a sound-design prompt; it does not itself deliver the audio file. Lyria is the audio-generation model for music.
- Make Gemini Lyria 3.5 the primary BGM provider. It is Google's full-song music generation model and costs USD 0.08 per request on the paid tier.
- Do not represent Lyria as an exact-duration SFX engine. Google's documented models generate music: Lyria 3 Clip always returns 30 seconds; Lyria 3.5 returns a couple of minutes and duration is influenced by the prompt. Neither documents a guaranteed 2-second effect or exact 20-second BGM result.
- Keep SFX generation behind a separately selected provider/implementation until it passes natural-sound quality, duration, commercial-use, privacy, and API-price checks. Do not silently trim model output and describe it as a model-generated exact-duration result.
- Keep generation disabled until paid billing, the provider secret, privacy notice, user-rights terms, and Audio Credit tariff are approved.

## Official Gemini pricing and direct cost

Prices below are Google's published paid-tier USD prices per generation request. V1/V2 are two independent requests, not a single request with two free alternatives.

| Gemini model | Documented result | Provider cost V1 | Provider cost V1 + V2 | 1,000 V1 requests |
| --- | --- | ---: | ---: | ---: |
| Lyria 3 Clip Preview (`lyria-3-clip-preview`) | Fixed 30-second MP3 music clip | $0.04 | $0.08 | $40 |
| Lyria 3.5 (`lyria-3.5`) | Full song, typically a couple of minutes | $0.08 | $0.16 | $80 |

Lyria 3.5 is the recommended BGM default. The cheaper Clip model is suitable only when a 30-second music clip is acceptable; it is a preview model and not a short-SFX solution. The current Gemini API pricing page lists no free tier for these Lyria calls.

### Illustrative customer-price floor

These are examples to compare tariff models, not proposed RESONA prices. At a 50% gross margin against provider charges alone, before payment fees, taxes, FX spread, retries, support, and infrastructure:

| Model | V1 cost | V1 + V2 cost | V1 price at 50% margin | V1 + V2 price at 50% margin |
| --- | ---: | ---: | ---: | ---: |
| Lyria 3 Clip | $0.04 | $0.08 | $0.08 | $0.16 |
| Lyria 3.5 | $0.08 | $0.16 | $0.16 | $0.32 |

Formula: `customer price = provider cost / (1 - target gross margin)`. At a 60% provider-cost-only gross margin, multiply the cost by 2.5 instead of 2.0. These calculations must be converted into Audio Credits only after RESONA decides what one credit costs (or how credits map to paid bundles) and approves a margin target. Do not infer a credit price from the existing UI.

## Pricing implementation implications

The current quote implementation charges configured credits per ten requested seconds. That does not match Gemini's flat per-request Lyria pricing or its documented output durations. Before enabling a Gemini route:

1. Quote by provider/model and requested variant count, using a versioned server-side rate card; do not scale Gemini provider cost by requested seconds.
2. Show the model's documented/actual duration before charging. For Gemini, do not promise exact requested seconds.
3. Charge V1 and V2 as two separately priced generations. If V2 fails after V1 succeeds, settle/refund each variant explicitly rather than treating the pair as an indivisible result.
4. Keep internal USD provider cost separate from customer Audio Credits. Preserve the current server-side quote and idempotent settlement flow.
5. Set a per-user daily/provider spend cap before launch. A V2 selection doubles the number of provider calls and direct model cost.

## Privacy and rights notice

RESONA does not persist generated audio; it returns the bytes to the active browser session for preview/download. However, Gemini generation sends the user's prompt to Google and transiently processes the generated result through RESONA's Worker before returning it. Do not tell users that no third party handles their prompt/audio.

For production, use Gemini API paid quota through a Cloud Project with active billing. Google's terms state that paid-service prompts/responses are not used to improve products, while abuse-prevention logs may retain prompts and outputs for 55 days. Unpaid quota may be used to improve Google products and may be human-reviewed, so it is unsuitable for production user generation. Google's terms say it does not claim ownership of generated content; RESONA still needs its own clear user-facing grant/rights terms and must not promise copyrightability, exclusivity, or non-infringement.

## Decision still needed before customer Audio Credit prices

The provider-side cost is now known for Lyria. A final customer quote cannot be responsibly set until RESONA confirms:

- the monetary value / sale price of one Audio Credit (or the credit bundle table);
- target gross margin and whether payment/tax/FX costs are included in that margin;
- whether V2 is exactly 2x V1 credits;
- whether long BGM is billed at the same flat per-request amount regardless of duration;
- whether the product accepts Gemini's non-exact duration, especially the fixed 30-second Clip output.

## Sources

- [Gemini Lyria music generation documentation](https://ai.google.dev/gemini-api/docs/music-generation?hl=en)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing.md)
- [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms?hl=en)
- [Gemini API abuse monitoring and retention](https://ai.google.dev/gemini-api/docs/usage-policies)

## SFX candidate check: ElevenLabs

ElevenLabs is a technically promising SFX candidate: its official API accepts a duration from 0.5 to 30 seconds, and its API overview says music/SFX are billed per generation. However, its public documentation is inconsistent on exact credit accounting: the SFX endpoint exposes a `character-cost` response header, the SFX overview says a specified duration costs 40 credits per second, and the general pricing page estimates 200 credits per generation. These figures are not directly interchangeable with USD or a RESONA Audio Credit; get written confirmation of the intended API plan/rate before quoting users.

There is also a product-rights conflict to resolve before implementation. The public ElevenCreative Sound Effects terms allow output to be used in games/apps when the plan permits commercial use, but prohibit distributing the output as isolated audio files/samples or as a sound-effects library. RESONA's current product promises browser preview and direct download of a standalone result. Do not select this provider for the current product flow without written confirmation that RESONA's exact preview/download workflow is allowed under its API agreement. “The provider does not claim ownership” is not by itself permission to redistribute isolated files.

Sources: [SFX endpoint and duration parameters](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert), [SFX overview / duration billing](https://elevenlabs.io/docs/overview/capabilities/sound-effects), [general pricing / approximate credit costs](https://elevenlabs.io/pricing), [ElevenCreative Sound Effects terms](https://elevenlabs.io/creative-terms), [ElevenAPI terms](https://elevenlabs.io/elevenapi-terms).

## Free SFX provider check

No free hosted text-to-SFX API has been approved for RESONA's commercial, standalone-preview/download workflow.

- Freesound is a sound library/search API, not a prompt-to-new-audio generator. Individual sounds have different licenses (CC0, CC-BY, CC-BY-NC); they are not automatically owned by the RESONA user. The Freesound API says free API use is for non-commercial purposes only. Commercial API access requires contacting UPF to negotiate terms. Thus the free API is not a compliant production provider for RESONA as a commercial product.
- A curated CC0/CC-BY source library is a possible separate feature, not generative SFX. It would need per-item license/attribution metadata, exclusion of NC assets, and UX that presents licensed source material rather than promising user ownership.
- Self-hosting an open model avoids a per-request hosted-provider fee, but is not cost-free: compute, hosting, scaling, operations, model/data license review, and output-rights review remain. A promising candidate is Stable Audio 3 Small-SFX; it is not yet approved for production pending local quality, hardware, and license validation.

Sources: [Freesound API terms](https://freesound.org/docs/api/terms_of_use.html), [Freesound API terms in detail](https://freesound.org/help/tos_api/), [Freesound license FAQ](https://freesound.org/help/faq/).

## Current routing decision

1. BGM: Gemini Lyria 3.5 primary. The user-facing duration selector and quote must disclose that the duration is prompt-guided, not guaranteed exact; use actual returned duration in the result. Lyria 3 Clip may be offered only as a clearly labeled fixed-30-second option after product approval.
2. SFX: no provider is approved by this analysis. Gemini/Lyria is a music engine, while ElevenLabs requires written rights/pricing confirmation for RESONA's standalone download model. Keep SFX generation disabled until an SFX provider clears those gates.
3. Gemini text-model prompt refinement may be added as a separate step later. Its token price must be costed separately from the flat Lyria generation call and it must not be described as generating the audio itself.
4. Free hosted SFX generation: none approved. Freesound's free API is non-commercial and its catalog licenses do not transfer ownership to each RESONA user; do not integrate it as the current paid SFX generator.

## Self-hosted SFX candidate: Stable Audio 3 Small-SFX

### Why it is the leading candidate

- Stability AI publishes a dedicated Small-SFX model in the Stable Audio 3 family. The official repository describes it as a 433M-parameter, CPU-capable model with up to 120 seconds of audio; its inference tooling includes optimized CPU paths for Windows, macOS, and Linux. This makes it a practical proof-of-concept candidate for standalone SFX rather than trying to force a music model to produce short effects.
- The official model card demonstrates prompt-and-duration generation. In the proposed RESONA flow, generated bytes remain ephemeral and are returned to the browser for preview/download rather than saved as a server-side asset.
- The Hugging Face weights are gated: access requires accepting the model terms and providing contact details. “Open weights” does not mean unrestricted download or a permissive open-source license.
- Stability's Community License permits commercial use while the organization and affiliates remain below USD 1 million in annual revenue, but commercial use requires registration; above that threshold an Enterprise license is required. This may mean no model-license fee for an eligible company, not zero total operating cost. Review the Community License, acceptable-use restrictions, registration requirements, and separate T5Gemma/Gemma terms before launch.
- Stability's announcement says users own generated outputs, subject to law and the applicable license. Treat this as a vendor statement, not a guarantee of copyrightability, uniqueness, non-infringement, or legal indemnity. RESONA still needs user-facing terms, checked against all model/dependency terms.
- The model card describes training on licensed and permissively licensed recordings. That provenance is useful, but is not a blanket legal warranty for each output.

### Recommended architecture and proof of concept

Do not run inference inside the JavaScript Worker. Run the model in a private Cloudflare Container, called only by the authenticated RESONA Worker; keep identity, quotes, reservations, and settlement in the Worker. Use one serialized inference instance initially, apply per-user rate limits, cap prompts and durations, and keep generated buffers ephemeral. Do not add R2 or audio persistence. Cloudflare Containers are a paid product; compute, provisioned memory/disk, Worker, Durable Object, and egress may all contribute to cost.

The first target is a Cloudflare preview Container, not a local model installation. The current spike uses the vendor Python CPU model API inside a Linux Container configured at `standard-4` (4 vCPU / 12 GiB), with model weights downloaded only after a valid Hugging Face token is provided. The Container returns WAV bytes from memory and has a short idle shutdown; generated user audio is never written to disk. Cloudflare Workers Paid pricing currently includes a monthly allowance, then bills active CPU and provisioned memory/disk separately; estimate actual per-effect cost only after benchmarking the model's real CPU time and cold starts. Cloudflare's current Containers pricing/limits and availability must be confirmed for the account before deployment.

Acceptance for the preview: measure cold-start/model-load time, 1–5 second generation latency, peak RAM, and actual durations; blind-listen across thunder, impacts, footsteps, cloth, doors, creature sounds, and UI. Reject the model if it sounds synthetic/canned or misses duration reliably. The model is trained on English descriptions, so Chinese prompt quality is another explicit test; do not silently claim equivalent multilingual quality. No model weights have been downloaded and no inference has been run yet.

### Decision

Proceed with Stable Audio 3 Small-SFX on Cloudflare Containers as the first self-hosted SFX proof-of-concept, not as an approved production provider. Gates: accept model and T5Gemma terms, confirm revenue/registration eligibility, verify account access to Containers and its cost, measure cold-start/CPU latency and sound quality, and review end-user rights language. Keep SFX generation disabled until these gates pass.

Sources: [Stable Audio 3 repository and CPU inference](https://github.com/Stability-AI/stable-audio-3), [Stable Audio 3 inference API](https://github.com/Stability-AI/stable-audio-3/blob/main/docs/workflows/inference.md), [Stable Audio 3 Small-SFX model card](https://huggingface.co/stabilityai/stable-audio-3-small-sfx), [Stability AI Community License](https://stability.ai/license), [commercial and usage licensing FAQ](https://kb.stability.ai/knowledge-base/stable-audio-commerical-and-usage-licensing), [Cloudflare Containers limits](https://developers.cloudflare.com/containers/platform/limits/), [Cloudflare Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/), [Cloudflare Container deployment](https://developers.cloudflare.com/containers/get-started/).

## Implementation checkpoint — 2026-10-20

- Added a Gemini Lyria 3.5 adapter and routed BGM generation through it; SFX remains behind a separate explicit feature flag while its provider decision remains open.
- BGM quotes use USD 0.08 per requested variant and a configurable `AUDIO_BGM_COST_MULTIPLIER` (preview value 2.0, i.e. 50% gross margin against model cost alone). Conversion to Audio Credits requires `AUDIO_CREDIT_VALUE_USD`; if absent, the quote fails closed. This value is intentionally not configured until RESONA establishes the monetary value of a credit.
- The requested duration is sent as a prompt target, not represented as a guarantee. Lyria results return unknown duration from the Worker; the browser reads the actual audio metadata for preview display. The generated bytes remain session-only and are not persisted.
- `AUDIO_GENERATION_ENABLED` and `AUDIO_SFX_GENERATION_ENABLED` remain false; no Gemini API key or public Worker route is configured. No paid Gemini request has been made.

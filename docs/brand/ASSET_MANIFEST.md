# RESONA — Brand Asset Manifest

> Canonical asset inventory and naming rules for the RESONA website and repository.

## 1. Repository structure

Recommended target structure:

```text
public/
└─ brand/
   ├─ logo/
   │  ├─ resona-wordmark.svg
   │  ├─ resona-mark-ring.svg
   │  ├─ resona-mark-r.svg
   │  └─ resona-logo-lockup.svg
   ├─ character/
   │  ├─ resona-character-master.webp
   │  ├─ resona-character-front.webp
   │  ├─ resona-character-back.webp
   │  ├─ resona-character-side.webp
   │  ├─ resona-character-portrait.webp
   │  ├─ resona-ear-node-detail.webp
   │  └─ resona-resonance-core-detail.webp
   ├─ hero/
   │  ├─ resona-hero-desktop.avif
   │  ├─ resona-hero-desktop.webp
   │  ├─ resona-hero-tablet.webp
   │  └─ resona-hero-mobile.webp
   ├─ social/
   │  └─ resona-social-preview.png
   └─ motion/
      └─ resona-resonance-ring.svg
```

## 2. Source/master policy

The repository should distinguish between:

- **source / master artwork** — high-resolution design source or archival PNG
- **runtime assets** — optimized AVIF/WebP/SVG used by the website

Do not serve the large concept sheet directly as a website background.

Store finalized web-ready crops separately.

## 3. Current approved visual concept

The approved direction is based on the current RESONA character concept:

- adult female embodiment of the platform
- long charcoal-black hair
- signal-mint highlights
- mint / teal eyes
- custom audio-node ear module
- compact resonance core
- black / graphite technical clothing
- restrained phase-violet accents
- waveform / routing / signal graphics

The current wide artwork direction is approved for use as the basis of the website Hero.

## 4. Hero image requirements

Desktop Hero:

- target composition: ultra-wide, approximately `3:1`
- no baked-in body copy
- face safe-area on left
- secondary figure may appear on right
- center / center-right negative space preserved for HTML overlay copy
- dark enough to support light text through a CSS scrim

Mobile Hero:

- dedicated crop or separately composed source
- face and ear module prioritized
- do not rely on `object-fit: cover` alone to rescue desktop composition

## 5. File naming

Use lowercase kebab-case.

Good:

- `resona-hero-desktop.avif`
- `resona-character-portrait.webp`
- `resona-mark-ring.svg`

Avoid:

- `final-final2.png`
- `new hero.png`
- date-only naming
- image-generator default filenames

## 6. Image formats

Preferred runtime formats:

- SVG for logos, marks, diagrams
- AVIF for large photographic / illustrated hero assets where browser support and quality are acceptable
- WebP as broad fallback
- PNG only when lossless transparency or social platform compatibility requires it

## 7. Web export targets

Recommended initial targets:

| Asset | Suggested max dimensions | Suggested budget |
|---|---:|---:|
| Desktop Hero | 2400 × 800 | <= 450 KB |
| Tablet Hero | 1600 × 900 | <= 350 KB |
| Mobile Hero | 900 × 1200 | <= 220 KB |
| Social Preview | 1200 × 630 | <= 800 KB |
| Character Portrait | 1200 px long edge | <= 300 KB |
| Character Detail | 1000 px long edge | <= 250 KB |

These are performance targets, not hard quality limits.

## 8. Character master precedence

Generated character art is not automatically canonical.

Before approving any new image, validate against:

1. `CHARACTER_MASTER.md`
2. `BRAND_DNA.md`
3. the approved canonical reference art

If a generated image invents a conflicting accessory, hairstyle, color dominance, costume category, or mascot behavior, it should not redefine the character.

## 9. Metadata

For archival source images, maintain a companion note where practical containing:

- asset purpose
- generation / source date
- intended crop
- canonical / exploratory status
- related prompt or art-direction note

Do not depend on embedded generator metadata as the only design record.

## 10. Asset status vocabulary

Use these statuses in future asset tracking:

- `canonical` — approved source of truth
- `approved-runtime` — approved optimized web derivative
- `exploratory` — concept only
- `deprecated` — do not use for new work

## 11. Next asset work after product handoff

When implementation resumes:

1. materialize the approved character master into the repository asset tree
2. create clean Hero desktop/tablet/mobile crops
3. build vector Resonance Ring / logo marks
4. export optimized AVIF/WebP variants
5. generate social preview
6. wire assets into the Hero component
7. add motion layers according to `MOTION_SPEC.md`

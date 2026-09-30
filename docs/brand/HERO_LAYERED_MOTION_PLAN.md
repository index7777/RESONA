# RESONA — Hero Layered Motion Implementation Plan

> Goal: make the existing RESONA Hero feel alive with restrained 2.5D / Live2D-like depth while preserving the current premium, technical visual language.

## Implementation status

- Milestone A — implemented on `hero-motion-plan`
- Milestone B — implemented on `hero-motion-plan`
- Milestone C — pending layered artwork assets
- Milestone D — pending audio-reactive refinement

Current implementation commit target: `Implement Hero motion scaffold and signal depth`.

The A+B implementation adds:

- extracted `BrandHero`
- `HeroMotionStage`
- damped pointer / touch CSS-variable depth motion
- SVG HUD / waveform / routing / signal-node overlays
- scan / optimize / verified / warning / error signal responses
- semantic Hero signal event API
- reduced-motion handling
- mobile layer reduction
- no new raster artwork and no Live2D / WebGL dependency

## 1. Direction

The current Hero already has a strong composition:

- near character on the left
- secondary character on the right
- city / interface background
- centered `Sound, as code.` message
- signal / waveform UI language

Do **not** replace this composition with a new mascot or animated object.

The motion target is:

> **Cyberpunk key visual that subtly comes alive.**

The Hero should feel layered, responsive and signal-aware, but never behave like a VTuber or game lobby character.

This plan extends `MOTION_SPEC.md` and keeps its restrictions:

- low amplitude
- no repeated mascot blinking loop
- no exaggerated breathing
- no head tracking
- no body bobbing
- no aggressive parallax
- no particle storms
- reduced-motion support is mandatory

## 2. Current implementation baseline

Current runtime Hero implementation:

- `src/components/brand/BrandSite.tsx`
- `src/components/brand/BrandHero.tsx`
- `src/components/brand/HeroMotionStage.tsx`
- `src/components/brand/HeroSignalOverlay.tsx`
- `src/components/brand/useHeroMotion.ts`
- `src/components/brand/heroSignal.ts`
- `src/brand.css`
- `src/hero-motion.css`
- `src/mobile.css`
- `public/brand/resona-hero-desktop-hq.webp`
- `public/brand/resona-hero-desktop.png`

Current Hero is still a single composite artwork. Therefore the first implementation phase does not assume editable PSD / Live2D source layers.

## 3. Motion architecture

Separate Hero motion into three independent systems:

```text
Idle Ambient Motion
        +
Pointer / Touch Depth Response
        +
Product-State Signal Response
```

Each system must be independently disableable.

### 3.1 Idle Ambient Motion

Always available unless `prefers-reduced-motion: reduce`.

Recommended behavior:

- image scale: `1.000 → 1.010–1.015`
- total translation: <= 4 px
- signal overlay drift: 2–6 px
- mint / violet luminance breathing: very low opacity
- cycle duration: 12–24 s

No repeated facial animation in Phase 1.

### 3.2 Pointer / Touch Depth Response

Desktop pointer movement should create shallow depth, not camera movement.

Normalized pointer coordinates:

```text
x = -1 ... +1
y = -1 ... +1
```

Recommended maximum offsets:

| Layer | X | Y |
|---|---:|---:|
| background | 2 px | 1 px |
| secondary / right visual plane | 3 px | 2 px |
| HUD / signal overlay | 5 px | 3 px |
| foreground overlay | 6 px | 4 px |

Use damped interpolation rather than direct pointer assignment:

```text
current += (target - current) * 0.06–0.10
```

Do not move the HTML headline / CTA with pointer input.

### 3.3 Product-State Signal Response

The Hero should react to RESONA workflow state through signal graphics, not character acting.

Suggested state vocabulary:

| Product state | Hero response |
|---|---|
| idle / ready | ambient drift only |
| playing | waveform / signal intensity response |
| rendering | one restrained scan pass |
| inspecting | frequency / grid overlay becomes slightly more visible |
| optimizing | violet-to-mint signal sweep, localized only |
| verified / clean | one short mint pulse |
| warning | one amber emphasis, no flashing |
| clipping / error | one coral emphasis, no persistent red animation |

The artwork itself should remain visually stable during state changes.

The runtime semantic bridge is exposed through `heroSignal.ts`:

```ts
emitHeroSignal({ state: 'optimizing' })
emitHeroSignal({ state: 'verified' })
```

Continuous values (`energy`, `highRatio`, `lowRatio`) are accepted for Milestone D without coupling the Hero to DSP internals.

## 4. Phase 1 — Single-image 2.5D Hero

This phase requires **no new generated artwork**.

### 4.1 Keep the composite Hero image as the base plane

Retain:

```text
public/brand/resona-hero-desktop-hq.webp
```

as the visual source of truth.

Runtime stage:

```text
brand-hero__stage
 ├─ brand-hero__art-base
 ├─ brand-hero__depth-light
 ├─ brand-hero__signal-stack
 │   ├─ SVG HUD back plane
 │   ├─ SVG HUD front plane
 │   ├─ scan line
 │   └─ state pulse
 └─ brand-hero__foreground-fx
```

### 4.2 Dynamic HUD elements

Current A+B overlay includes:

- horizontal waveform traces
- frequency ticks
- routing line
- small signal nodes
- scan line
- phase-violet data fragments

These layers move independently and create depth without cutting the character artwork.

### 4.3 Preserve text stability

The following remain fixed in screen space:

- `PROGRAMMABLE AUDIO`
- `Sound, as code.`
- lede
- CTA buttons
- DEFINE / RENDER / INSPECT / SHIP rail

This protects readability and gives the moving artwork a stable visual anchor.

## 5. Phase 2 — True layered artwork

Only start after a layered master or approved layer extraction exists.

Recommended runtime asset structure:

```text
public/brand/hero/layers/
├─ hero-bg-city.webp
├─ hero-right-character.webp
├─ hero-left-body.webp
├─ hero-left-head.webp
├─ hero-left-hair-back.webp
├─ hero-left-hair-front.webp
├─ hero-left-ear-module.webp
├─ hero-foreground.webp
└─ hero-mask.webp
```

### 5.1 Layer movement limits

Recommended maximum desktop travel:

| Layer | X | Y | Rotation |
|---|---:|---:|---:|
| city | 2 px | 1 px | 0° |
| right character | 2–3 px | 2 px | <= 0.15° |
| left body | 2 px | 1 px | <= 0.1° |
| left head plane | 3–4 px | 2 px | <= 0.2° |
| front hair | 5–7 px | 3 px | <= 0.35° |
| ear module / mint accents | 4–6 px | 2 px | <= 0.25° |
| foreground FX | 6–8 px | 4 px | <= 0.4° |

### 5.2 Character animation policy

Allowed:

- hair-tip inertia
- coat-edge drift
- ear-node / mint-light breathing
- extremely subtle differential head-plane movement created by depth separation

Not allowed by default:

- cursor-following eyes
- continuous blinking loop
- lip movement
- full head tracking
- chest / body breathing loop
- exaggerated hair physics

## 6. Mobile behavior

Mobile is not a reduced desktop parallax implementation.

Use:

```text
idle ambient motion
+
very small touch response
+
product-state signal response
```

Do not rely on hover and do not request device-orientation permission.

Current A+B mobile behavior:

- pointer/touch travel is reduced
- background motion remains shallow
- back-grid HUD plane is hidden
- data fragments are hidden
- signal nodes are reduced
- large blur animation is avoided
- `touch-action: pan-y` preserves page scrolling

## 7. React implementation shape

Implemented structure:

```text
src/components/brand/
├─ BrandSite.tsx
├─ BrandHero.tsx
├─ HeroMotionStage.tsx
├─ HeroSignalOverlay.tsx
├─ heroSignal.ts
└─ useHeroMotion.ts
```

`BrandSite.tsx` remains composition-focused.

`useHeroMotion.ts` handles:

- pointer normalization
- touch / pointer lifecycle
- interpolation / damping
- reduced-motion detection
- document visibility handling
- CSS variable output

Animation does not set React state every frame.

## 8. Integration with RESONA audio / workflow state

The Hero consumes a semantic state interface instead of DSP internals:

```ts
export type HeroSignalState =
  | 'idle'
  | 'playing'
  | 'rendering'
  | 'inspecting'
  | 'optimizing'
  | 'verified'
  | 'warning'
  | 'error';
```

Optional continuous values:

```ts
type HeroSignalMetrics = {
  energy?: number;
  highRatio?: number;
  lowRatio?: number;
};
```

Milestone B provides the event API and visual state consumers. Wiring detailed Sound Lab metrics into these values remains Milestone D so decorative motion cannot interfere with core audio work.

## 9. Performance budget

Desktop target:

- 60 fps on normal integrated graphics
- no layout changes in continuous pointer loops
- hot path restricted to CSS variable writes and transforms

Mobile target:

- visually stable on mainstream iPhone / Android hardware
- no pointer RAF loop after motion settles
- no pointer RAF work while document is hidden
- animation must not compete with Sound Lab offline rendering / Inspector analysis

## 10. Accessibility

Implemented baseline:

```css
@media (prefers-reduced-motion: reduce) {
  /* Hero transforms / ambient animations disabled */
}
```

Decorative motion remains `aria-hidden="true"`.

Pointer motion is not required to reveal content or actions.

## 11. Asset-production plan

Before Phase 2, prepare a layered master from the approved Hero artwork.

Required source categories:

1. clean / reconstructed background behind left character
2. clean / reconstructed background behind right character where required
3. left character body
4. left head / face plane
5. front hair group
6. back hair group
7. ear module / signal jewelry where separable
8. right character
9. foreground overlays
10. optional masks for lighting and occlusion

Do not commit crude automatic cutouts as canonical runtime assets.

## 12. Implementation sequence

### Milestone A — motion scaffold ✅

- extracted `BrandHero` from `BrandSite.tsx`
- added `HeroMotionStage`
- added pointer / touch CSS-variable motion
- retained current composite artwork
- kept headline / CTA stable

### Milestone B — signal depth ✅

- added SVG signal / waveform overlay layers
- added scan / optimize / verified / warning / error responses
- added semantic Hero signal API
- added reduced-motion handling
- added mobile layer simplification

### Milestone C — layered artwork

- create approved layered assets
- add separate character / background planes
- add restrained hair / clothing inertia
- mobile simplification review

### Milestone D — audio-reactive refinement

- map playback energy to waveform / signal intensity
- wire Sound Lab semantic states directly
- do not deform the character from raw audio metrics
- ensure Sound Lab performance remains unaffected

## 13. QA matrix

Test at minimum:

### Desktop

- 1920×1080 Chrome
- 1440×900 Chrome / Edge
- Safari desktop where available

### Mobile

- 390×844 iPhone-class viewport
- 430×932 large iPhone-class viewport
- ~360×800 Android-class viewport

Verify:

- headline never shifts with parallax
- CTA remains clickable during motion
- no horizontal overflow
- touch scrolling is never captured accidentally
- Hero motion does not degrade slider interaction in Sound Lab
- reduced motion removes nonessential animation
- background-tab return does not produce a large motion jump

## 14. Acceptance criteria

The implementation is successful when:

1. a static screenshot still looks essentially identical to the current approved Hero
2. movement becomes noticeable mainly after several seconds or direct interaction
3. pointer movement produces depth without obvious image sliding
4. mobile remains simpler than desktop and does not feel like a scaled desktop effect
5. Sound Lab performance takes priority over Hero animation
6. the character remains premium artwork rather than becoming a mascot performer
7. all motion can be disabled without loss of content or workflow

## 15. Non-goals for the first implementation

Not added:

- Live2D Cubism dependency
- WebGL / Three.js
- Spine runtime
- eye tracking
- mouth animation
- continuous blinking
- cloth simulation
- particle engine
- gyroscope permission
- audio-driven character deformation

The first implementation proves **layering + restrained inertia + RESONA signal animation** before layered character artwork is introduced.

# RESONA — Hero Layered Motion Implementation Plan

> Goal: make the existing RESONA Hero feel alive with restrained 2.5D / Live2D-like depth while preserving the current premium, technical visual language.

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
- `src/brand.css`
- `src/mobile.css`
- `public/brand/resona-hero-desktop-hq.webp`
- `public/brand/resona-hero-desktop.png`
- existing CSS ambient drift
- existing signal-line animation

Current Hero is still a single composite artwork. Therefore the first implementation phase must not assume editable PSD / Live2D source layers.

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
| playing | waveform / signal intensity follows playback energy where practical |
| rendering | one restrained scan pass |
| inspecting | frequency / grid overlay becomes slightly more visible |
| optimizing | violet-to-mint signal sweep, localized only |
| verified / clean | one short mint pulse |
| warning | one amber emphasis, no flashing |
| clipping / error | one coral emphasis, no persistent red animation |

The artwork itself should remain visually stable during state changes.

## 4. Phase 1 — Single-image 2.5D Hero

This phase requires **no new generated artwork** and should be implemented first.

### 4.1 Keep the composite Hero image as the base plane

Retain:

```text
public/brand/resona-hero-desktop-hq.webp
```

as the visual source of truth.

Convert `HeroArtwork()` from a single picture-only element into a layered Hero stage:

```text
brand-hero__stage
 ├─ brand-hero__art-base
 ├─ brand-hero__depth-light
 ├─ brand-hero__hud-back
 ├─ brand-hero__hud-front
 └─ brand-hero__foreground-fx
```

The additional layers should initially be CSS / SVG signal layers rather than duplicated raster characters.

### 4.2 Rebuild dynamic HUD elements outside the raster image

Overlay selected RESONA visual language using SVG / CSS:

- horizontal waveform trace
- frequency ticks
- thin routing lines
- small signal nodes
- scan line
- phase-violet data fragments

These layers can move independently and create depth without needing to cut the character artwork immediately.

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
└─ hero-mask.webp          # optional depth / lighting helper
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

These values are intentionally small.

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

If facial animation is ever explored, it should be an optional later experiment and must not redefine the brand motion language.

## 6. Mobile behavior

Mobile is not a reduced desktop parallax implementation.

### 6.1 Mobile motion model

Use:

```text
idle ambient motion
+
very small touch response
+
product-state signal response
```

Do not rely on hover.

Do not request device-orientation permission for the default experience.

### 6.2 Touch response

On touch inside Hero:

- target offset follows touch position at <= 2–3 px
- release returns to neutral with spring / damping
- no persistent tracking after `touchend` / pointer release

### 6.3 Mobile performance

On <= 720 px:

- reduce animated layer count
- disable expensive blur animation
- avoid continuously animated large SVG filters
- reduce signal-node count
- stop pointer RAF loop when no interaction requires it
- pause ambient motion when document is hidden where practical

The current HQ WebP may remain the image source while crop is controlled in CSS, unless a future dedicated mobile art crop is approved.

## 7. React implementation shape

Recommended component structure:

```text
src/components/brand/
├─ BrandSite.tsx
├─ BrandHero.tsx
├─ HeroMotionStage.tsx
├─ HeroSignalOverlay.tsx
└─ useHeroMotion.ts
```

`BrandSite.tsx` should remain composition-focused.

### 7.1 `useHeroMotion.ts`

Responsibilities:

- pointer normalization
- touch / pointer lifecycle
- interpolation / damping
- reduced-motion detection
- document visibility handling
- CSS variable output

Recommended output through CSS custom properties:

```text
--hero-x
--hero-y
--hero-bg-x
--hero-bg-y
--hero-fg-x
--hero-fg-y
--hero-signal-intensity
```

Prefer CSS transforms driven by variables rather than React state updates every frame.

### 7.2 Animation loop

Use one `requestAnimationFrame` loop only while necessary.

Avoid rerendering React components every animation frame.

Pseudo-flow:

```text
pointer event
   ↓
update target ref
   ↓
RAF interpolates current ref
   ↓
set CSS custom properties on stage element
```

## 8. Integration with RESONA audio / workflow state

Do not tightly couple the brand Hero directly to DSP internals.

Expose a small semantic Hero state interface:

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
  energy?: number;      // normalized 0..1
  highRatio?: number;   // normalized 0..1
  lowRatio?: number;    // normalized 0..1
};
```

The brand component consumes semantic state; Sound Lab remains the source of truth.

## 9. Performance budget

Desktop target:

- 60 fps on normal integrated graphics
- no layout changes in continuous loops
- only `transform`, `opacity`, CSS variables and cheap compositing in hot paths

Mobile target:

- visually stable on mainstream iPhone / Android hardware
- no continuous CPU work when Hero is outside viewport if practical
- animation must not compete with Sound Lab offline rendering / Inspector analysis

Important: audio rendering and analysis take priority over decorative Hero motion.

When heavy Sound Lab work begins, Hero ambient animation may be reduced or temporarily paused.

## 10. Accessibility

Mandatory:

```css
@media (prefers-reduced-motion: reduce) {
  /* disable Hero parallax / ambient motion */
}
```

The Hero must remain fully understandable with all motion disabled.

Decorative motion layers remain `aria-hidden="true"`.

Pointer motion must never be required to reveal content or actions.

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

Each extracted layer should be visually reviewed at:

- desktop 1440–1920 px width
- tablet ~768–1024 px
- mobile 360–430 px

## 12. Implementation sequence

### Milestone A — motion scaffold

- extract `BrandHero` from `BrandSite.tsx`
- add `HeroMotionStage`
- add pointer / touch CSS-variable motion
- keep current composite artwork
- preserve current visual appearance when motion is idle

### Milestone B — signal depth

- add SVG signal / waveform overlay layers
- add scan response
- connect semantic Hero states
- verify reduced motion

### Milestone C — layered artwork

- create approved layered assets
- add separate character / background planes
- add restrained hair / clothing inertia
- mobile simplification

### Milestone D — audio-reactive refinement

- optionally map playback energy to waveform / signal intensity
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
- no layer reveals unpainted / transparent holes
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

Do not add in the first pass:

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

The first implementation should prove that **layering + restrained inertia + RESONA signal animation** is enough.

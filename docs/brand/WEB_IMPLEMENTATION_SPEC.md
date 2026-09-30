# RESONA — Website Implementation Specification

> Implementation handoff for applying the RESONA character identity and brand DNA to the existing React/Vite website.

## 1. Scope

This document defines the intended implementation after the current product work is complete.

**Do not implement these changes until the active product work is handed back.**

Target files will likely include:

- `src/App.tsx`
- `src/SoundLab.tsx`
- `src/styles.css`
- `src/main.tsx` only if app-shell behavior requires it
- new brand components under `src/components/brand/`
- static assets under `public/brand/`

The website remains a functional audio tool. Branding must not obstruct the workstation experience.

## 2. Page architecture

Recommended top-level structure:

```text
App
├─ IntroGate              optional one-time brand intro
├─ SiteHeader             compact navigation / brand lockup
├─ Hero                   character artwork + positioning copy
├─ ProductWorkspace       existing Sound Lab / Music Lab
├─ CapabilityStrip        synthesis / inspect / iterate / export
└─ Footer
```

On tool-focused routes or states, the Hero can collapse to a thin branded header so the workspace retains vertical space.

## 3. Hero specification

### Artwork

Use an ultra-wide cinematic RESONA hero image derived from the canonical character design.

Composition rules:

- large portrait / facial presence on left
- secondary full or 3/4 figure on right
- strong negative space in center or center-right for copy
- dark graphite environment
- Signal Mint and restrained Phase Violet highlights
- subtle waveform / routing / spectrum elements
- no baked-in marketing copy inside the artwork asset

### Responsive treatment

Desktop:

- aspect ratio target: approximately `3:1`
- hero min-height: `clamp(360px, 42vw, 620px)`
- use `object-fit: cover`
- preserve face-safe crop region

Tablet:

- shift focal point using `object-position`
- allow text overlay to stack above or below visual if required

Mobile:

- do not force the entire 3:1 composition into a narrow viewport
- use a dedicated portrait crop or art-directed `<picture>` source
- prioritize face, ear module, and mint signal details

### Hero overlay

Use a dark gradient scrim rather than baking text into the image.

Suggested structure:

```tsx
<section className="brand-hero">
  <picture className="brand-hero__art">...</picture>
  <div className="brand-hero__scrim" />
  <div className="brand-hero__content">
    <p className="brand-hero__eyebrow">PROGRAMMABLE AUDIO</p>
    <h1>Sound, as code.</h1>
    <p>Build, inspect, iterate and export audio from structured definitions.</p>
    <div className="brand-hero__actions">...</div>
  </div>
</section>
```

## 4. Workspace relationship

The workspace should remain darker, denser, and more instrument-like than the marketing hero.

Rules:

- character artwork should not sit behind sequencers, inspectors, editors, or code panels
- hero transitions into the existing workstation using shared colors and signal motifs
- product panels use brand tokens, not character imagery
- preserve current information density

## 5. Design tokens

Introduce canonical variables before refactoring individual components:

```css
:root {
  --resona-black: #0b0f14;
  --resona-surface-1: #0d1117;
  --resona-surface-2: #121821;
  --resona-graphite: #2a2f36;
  --resona-border: #232c38;
  --resona-text: #f4f6f8;
  --resona-text-secondary: #8b97a8;
  --resona-muted: #667284;
  --resona-signal: #5ef2ce;
  --resona-phase: #806cff;
  --resona-warning: #ffc56e;
  --resona-error: #ff6f87;

  --resona-radius-sm: 6px;
  --resona-radius-md: 10px;
  --resona-radius-lg: 16px;
}
```

Map existing colors to tokens before changing visual behavior.

## 6. Component language

### Primary actions

- solid Signal Mint
- dark foreground text
- minimal glow

### Secondary actions

- graphite surface
- neutral border
- white / secondary text

### Agent / transform actions

- Phase Violet reserved for secondary intelligent transformations or analysis emphasis
- do not make violet a competing primary CTA color

### States

- Mint = clean / verified / active
- Amber = warning / review
- Coral = clipping / error / destructive
- Violet = phase / transform / secondary intelligence state

## 7. Character usage in UI

Allowed:

- Hero
- splash / intro
- documentation cover
- selected onboarding panel
- release card
- empty state where useful

Not allowed:

- persistent talking avatar
- chat panel unless the product independently adds a chat feature
- character portraits inside every panel
- animated face following cursor

## 8. Accessibility

Required:

- hero artwork must have an empty alt when decorative; meaningful alt only when content-bearing
- text must not rely on image contrast alone
- maintain WCAG-oriented contrast for controls and body text
- keyboard focus states remain visible
- motion obeys `prefers-reduced-motion`
- animation must never be required to understand state

## 9. Performance

Targets:

- hero artwork delivered as modern compressed assets (AVIF/WebP preferred)
- separate desktop/mobile crops rather than one oversized image for all devices
- do not block first meaningful paint on animation libraries
- static fallback must render immediately
- avoid autoplay video for default hero
- use transform/opacity animation where possible

Suggested asset budget:

- desktop hero: ideally <= 450 KB compressed
- mobile hero: ideally <= 220 KB compressed
- logo / vector UI assets: SVG

## 10. Implementation phases

### Phase A — Foundation

- add tokens
- add brand asset directory
- add hero component shell
- no behavior changes to audio engine

### Phase B — Hero + Navigation

- implement art direction
- responsive image loading
- hero CTA into Sound Lab / Music Lab

### Phase C — Workspace skin

- map existing controls to tokens
- reduce competing gradients
- unify radius, borders, status colors

### Phase D — Motion

- implement intro and ambient signal motion from `MOTION_SPEC.md`
- reduced-motion fallback
- performance pass

### Phase E — QA

- desktop / tablet / mobile
- keyboard navigation
- audio controls unaffected
- no layout shift from hero assets
- responsive crop validation

## 11. Acceptance criteria

The website implementation is successful when:

- RESONA is visually recognizable before reading the name
- character identity and product UI feel like one system
- the product still reads as a professional developer audio tool
- the character never turns the interface into a chatbot or idol product
- the Hero can be removed and the workstation still retains RESONA's colors, spacing, status language, and signal motifs
- motion is additive, not required

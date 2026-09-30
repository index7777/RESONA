# RESONA — Motion Specification

> Motion language for the RESONA website. Motion should make the system feel alive without turning the site into an animated mascot experience.

## 1. Principles

RESONA motion is:

- signal-like
- precise
- restrained
- low-amplitude
- technically legible
- never ornamental for its own sake

Avoid:

- bouncing mascot behavior
- continuous character lip / face animation
- cursor-following eyes
- long cinematic loading sequences
- particle storms
- large parallax travel
- constant neon pulsing

## 2. Intro sequence

Target duration: **1.2–2.0 s maximum**.

Recommended sequence:

```text
0.00s  dark field / static page shell available
0.15s  resonance core point appears
0.30s  incomplete resonance ring resolves
0.50s  waveform expands horizontally
0.75s  RESONA wordmark resolves with scan/reveal
1.00s  hero artwork begins fade/translate-in
1.25s  navigation and CTA settle
1.50s  intro overlay fully releases interaction
```

Rules:

- no blocking spinner
- content should be mountable underneath from the start
- intro should not wait for audio engine initialization
- on slow devices, prefer skipping ornamental steps rather than extending duration

## 3. Playback frequency

Recommended behavior:

- first visit in a session: full intro
- subsequent navigation within the same session: no full intro
- optional lightweight mark pulse on route transition

If persistence is used, session-level storage is preferred over long-lived local storage so returning visitors are not permanently denied the experience.

## 4. Resonance mark animation

The mark should animate from signal logic:

1. core point brightens
2. ring appears in two arcs
3. waveform passes through core
4. glow decays to steady state

Use SVG stroke-dasharray / stroke-dashoffset or path-length animation.

Do not rotate the ring continuously.

## 5. Hero ambient motion

Default amplitude should be subtle enough that users may not consciously notice it.

Allowed layers:

- slow background artwork scale: `1.00 → 1.015`
- 2–6 px drift on signal overlays
- very low-opacity waveform travel
- tiny light intensity breathing on resonance elements
- optional foreground/background differential movement on pointer devices

Suggested duration ranges:

- ambient image drift: 12–24 s
- signal pass: 6–12 s
- resonance pulse: 3–6 s

Never animate the entire hero aggressively.

## 6. Character animation policy

Default website character artwork is **still art**.

If a layered asset exists, only the following may move subtly:

- hair tip drift
- coat edge drift
- mint light intensity
- surrounding signal graphics

Do not animate:

- mouth talking
- repeated blinking as a mascot loop
- exaggerated breathing
- head tracking
- body bobbing

The goal is atmospheric life, not virtual-performer behavior.

## 7. Interaction motion

### Buttons

- hover: 80–140 ms
- press: 60–100 ms
- use slight luminance/border change and <= 1 px translate

### Panels

- focus/selection: border or shadow transition 120–180 ms
- avoid scale-up cards in the workstation

### Signal states

Verified / clean:

- one short mint pulse

Warning:

- color shift to amber, no flashing

Error / clipping:

- coral state with one short emphasis pulse; no persistent flashing

Phase / transform:

- restrained violet sweep or outline response

## 8. Page transitions

Prefer:

- opacity
- small y translation (`4–12 px`)
- localized signal-line reveal

Avoid:

- full-screen wipes
- 3D page rotations
- large zoom transitions

## 9. Reduced motion

Mandatory CSS baseline:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Implementation may use more targeted rules, but all essential state must remain understandable without motion.

## 10. Technical implementation preference

Priority order:

1. CSS transitions / keyframes
2. SVG path animation
3. Web Animations API
4. Framer Motion only if coordination complexity justifies dependency cost

Use transform and opacity where possible.

Do not use autoplay video as the default intro mechanism.

## 11. Performance guardrails

- no animation should block pointer input after the first usable content is ready
- avoid layout-triggering properties in continuous loops
- pause or reduce ambient loops when tab is hidden where practical
- no canvas animation unless SVG/CSS cannot express the required visual
- target smooth motion on mainstream integrated graphics

## 12. Acceptance criteria

Motion is successful when:

- the site feels subtly alive
- the character remains premium and restrained
- audio-tool usability is unchanged
- reduced-motion users receive the full product experience
- the intro never feels like waiting for an advertisement

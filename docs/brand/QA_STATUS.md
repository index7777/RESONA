# RESONA — Brand Implementation QA Status

## Current state

Branch: `brand-implementation`  
Pull request: `#1`  
Status: implementation complete enough for visual QA; keep as draft until rendered verification passes.

## Completed checks

- Brand shell remains additive around the existing React/Vite application.
- Existing Sound Lab / Music Lab source files are not rewritten by the brand pass.
- Desktop hero source is art-directed at 3:1 and a dedicated mobile crop exists.
- Hero image failure has an SVG fallback.
- Intro is session-scoped and no longer flashes the hero before the intro overlay mounts.
- Intro never captures pointer input.
- `prefers-reduced-motion` rules are present in the brand stylesheet.
- Hero and character artwork are kept outside dense workbench panels.
- Canonical color tokens map Signal Mint, Phase Violet, warning and error states consistently.

## Render QA still required

The current ChatGPT execution environment cannot clone GitHub over the shell network, and this repository is not yet connected to a Vercel project. Therefore a real browser build/render cannot be completed from this session yet.

Before merging PR #1, verify the following in a browser-capable environment:

1. `npm install && npm run build`
2. Desktop viewport: 1440 × 900
3. Wide desktop viewport: 1920 × 1080
4. Tablet viewport: 834 × 1194
5. Mobile viewport: 390 × 844
6. Confirm first-session intro duration is approximately 1.65 s and subsequent navigation does not replay it.
7. Confirm `prefers-reduced-motion: reduce` removes ornamental motion without hiding content.
8. Confirm `Open Workbench` lands on the workspace without clipping the mode selector.
9. Smoke test Sound Lab play / stop / export.
10. Switch to Music Lab and smoke test play / stop / export.
11. Inspect hero crop: face remains readable on mobile; secondary figure remains visible on wide desktop where possible.
12. Confirm no horizontal overflow at 320 px width.

## Visual fidelity ledger

Compare the browser render against the accepted RESONA hero direction:

| Area | Target |
|---|---|
| Character | Large close portrait on left, secondary figure on right on desktop |
| Negative space | Central area remains usable for headline and CTA |
| Palette | Charcoal-first, Signal Mint dominant, Phase Violet secondary |
| Motion | Subtle signal drift; no mascot-like character motion |
| Typography | Quiet geometric/software tone; no novelty techno font |
| Workspace | Dense professional instrument UI; no character art behind tools |
| Mobile | Dedicated portrait art; headline and actions remain readable |

## Merge gate

Do not mark PR #1 ready or merge until browser render, build/typecheck, responsive QA and core audio smoke tests pass.

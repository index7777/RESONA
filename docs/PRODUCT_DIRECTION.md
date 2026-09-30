# RESONA — Product Direction & Design Principles

> Decision record from the post-MVP product discussion. This document defines what RESONA is trying to prove and what must not be confused with adjacent goals.

## 1. Core product definition

RESONA is an **AI-native procedural audio engineering system centered on a machine-operable Sound IR**.

Natural-language prompting is one frontend, not the product center. GUI, agents and APIs should all be able to create or mutate the same RESONA IR.

```
Natural Language ─┐
GUI ──────────────┤
Agent ────────────┤
API ──────────────┘
        ↓
   Sound Intent
        ↓
Sound Design Knowledge
        ↓
     Compiler
        ↓
    RESONA IR
        ↓
Deterministic Renderer
        ↓
      Audio
        ↓
Analyze / Validate
        ↓
  Repair Planner
        ↓
    RESONA IR
        ↺
```

**Sound IR is the center. Audio is a rendered artifact. Prompt is only one frontend.**

## 2. Three core assets

### RESONA IR
The machine-operable representation of a sound. It must remain editable, reproducible, serializable and suitable for agent/API/GUI manipulation.

### Sound Design Knowledge
The library must evolve beyond JSON presets into machine-readable sound-design knowledge:

- archetypes and intended identities
- recommended synthesis topology
- valid semantic modifiers
- parameter constraints
- known failure modes
- preferred repair strategies
- validated example programs

Example family:

```
LASER
├─ identity / semantic tags
├─ recommended topology
│  ├─ oscillator
│  ├─ optional FM
│  ├─ pitch trajectory
│  ├─ filter
│  └─ transient layer
├─ modifiers
│  ├─ metallic
│  ├─ dark
│  ├─ bright
│  ├─ soft
│  ├─ heavy
│  └─ short
├─ constraints
├─ known failure modes
│  ├─ HF burst
│  ├─ clipping
│  ├─ excessive resonance
│  └─ weak transient
└─ repair preferences
   ├─ reduce FM
   ├─ reduce resonance
   ├─ lower cutoff
   └─ attenuate offending layer
```

### Analyze → Repair → Verify
RESONA should make measurable audio-engineering problems observable and actionable by machines. The repair loop must preserve before/after evidence and explicitly report unresolved cases rather than pretending every problem is repairable.

## 3. Claim boundary

Current analysis/debugging is a **limited-domain heuristic audio-engineering debugger**.

It can reason about measurable signals such as:

- peak / RMS / crest
- clipping
- DC offset
- low/sub energy
- high-frequency energy
- time-frequency bursts
- layer contribution / attribution

It must **not** be presented as general machine hearing or arbitrary perceptual taste. It does not yet establish that a click sounds premium, an explosion has enough punch, an alarm is subjectively pleasant, or a laser has the desired sci-fi character.

The defensible claim is:

> RESONA can detect, attribute and repair selected measurable audio-engineering anomalies.

## 4. AI engineering story vs architecture story

Do not conflate these.

An engineering execution story is evidence about **how AI built or operated the product**, e.g. agent counts, token counts, elapsed workflow, bugs found, repairs, regression runs.

RESONA currently has the stronger claim:

> **AI-native audio engineering architecture.**

A stronger engineering execution story should be earned through actual system evidence, for example:

```
100 sound programs generated
→ 100 rendered
→ 100 inspected
→ 17 validation failures
→ 14 automatically repaired
→ 3 explicitly unresolved
→ regression/validation rerun
→ 100 reproducible asset packages
```

The system's own trace should become the evidence. Do not invent agent/token statistics.

## 5. 100-sound target

Do **not** optimize for “100 presets”. The target is:

> **100 curated, validated sound programs.**

A program should carry at minimum:

```
preset ID
category / intent
semantic tags
RESONA IR / DSL source
seed
rendered WAV
analysis snapshot
validation status
```

A diversity signal must also exist so near-duplicate parameter permutations are not counted as distinct content.

Initial diversity dimensions can include:

- duration
- spectral centroid
- spectral rolloff
- RMS / crest
- envelope shape
- pitch trajectory
- layer topology / layer count
- FM characteristics
- noise contribution
- filter characteristics

This does not need to be an academic perceptual metric initially. Its first job is to catch obvious near-duplicates.

Preferred content strategy:

```
~15 sound families
× 4–5 authored base designs
= 60–75 strong base programs
+ deliberately designed identity-preserving variants
= 100 curated programs
```

Do not claim random permutations as 100 distinct sounds.

## 6. Product proof / representative demo

Do not change the roadmap merely to match another instrument's preset count.

A stronger RESONA proof is an end-to-end engineering demo:

```
Input:
"short metallic error beep"

1. compile intent
2. select sound-design knowledge
3. produce RESONA IR
4. deterministic render
5. analyze / validate
6. detect a measurable anomaly
7. attribute it to a layer
8. select repair strategy
9. mutate RESONA IR
10. re-render
11. validate before/after
12. export WAV + source + analysis + repair trace
```

Then change a semantic modifier such as:

```
metallic → soft
```

and immediately recompile/re-render through the same system.

This demonstrates RESONA's independence better than matching a raw preset count.

## 7. Product principles to preserve

1. **Sound IR is the center, not WAV.**
2. **Prompt is a frontend, not a mandatory pipeline entry point.**
3. **Measure → Repair → Verify is more distinctive than prompt → sound.**
4. **Sound Library should become composable machine-readable sound-design knowledge, not a preset dump.**
5. **Deterministic rendering and reproducibility are first-class requirements.**
6. **Unresolved engineering problems must remain explicitly unresolved.**
7. **Claims must stay inside measured capabilities; do not imply general AI hearing.**
8. **A sound count is meaningful only when the programs are curated, reproducible, diverse and validated.**
9. **Every production asset should be traceable back to source/IR and engineering evidence.**

## 8. Target evidence / KPIs

Longer-term proof targets discussed:

```
100 validated sound programs
15 sound families
100% reproducible rendering
0 invalid RESONA IR / DSL in the validated library
source + audio + analysis for every asset
clear before/after evidence for repair-loop changes
diversity checks preventing obvious duplicate-count inflation
```

These are direction-setting targets, not claims that the current MVP has already achieved them.

## 9. Current differentiation

The product should not be framed primarily as another browser synthesizer or another prompt-to-WAV generator.

The intended differentiation is:

> **RESONA makes procedural sound behave more like software: compilable, editable, reproducible, measurable, testable, repairable and deliverable.**

A concise conceptual statement:

> AI does not need unrestricted “hearing” to work reliably on every audio task. RESONA gives agents a structured sound representation, engineering measurements and a bounded repair/verification loop.

This document should be used as a guardrail for future architecture, library expansion, demos and product claims.

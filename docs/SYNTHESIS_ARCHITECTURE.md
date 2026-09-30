# RESONA — Synthesis Architecture Expansion Plan

> Implementation decision record. Defines how RESONA expands beyond oscillator/noise-centric DSP. This is a plan, not a claim that these engines already exist.

## Goal

Evolve RESONA into a multi-model procedural sound system while preserving RESONA IR as the center, deterministic/traceable rendering, GUI/Agent/API/compiler interoperability, and Analyze → Validate → Repair.

Web Audio is the browser execution environment, not the synthesis ceiling. Custom DSP can use Web Audio nodes, offline rendering, JavaScript DSP and AudioWorklet.

## Target architecture

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
Source / Synthesis
        ↓
Resonator / Body
        ↓
Modulation / Processing
        ↓
      Space
        ↓
Deterministic Renderer
        ↓
      Audio
        ↓
Analyze / Validate
        ↓
  Repair Planner
        ↓
    RESONA IR ↺
```

Do not keep adding unrelated optional fields to the current oscillator Layer. The next IR generation should use typed, composable synthesis primitives.

## IR direction

Conceptually separate:

- **Source:** oscillator, noise, sample, Karplus–Strong, granular, wavetable, modal exciter.
- **Resonator:** modal bank, string, tube, body/material resonance.
- **Processor:** filter, saturation, delay, compressor, EQ.
- **Space:** algorithmic reverb, convolution reverb.
- **Event composition:** deterministic timed sub-events for compound Foley.

Before replacing DSL v2, define a versioned schema and migration path.

## Engines

### 1. Modal synthesis

First new engine because it is broadly reusable for wood, impacts, stamps, bells, gongs, ceramics and body resonance.

Represent modes as frequency + amplitude + decay, with optional inharmonicity/detune. Expose excitation type, per-mode gain/decay, global damping and reusable material/body definitions.

The modal engine should work both standalone and as a resonator after another source.

### 2. Karplus–Strong / plucked string

For generic plucks and guzheng/guqin/pipa-like programs.

Minimum controls: fundamental, excitation character, pluck position, damping, decay, brightness, dispersion, pitch trajectory/bend, vibrato, release damping and seed.

Start with fractional delay + damping/filtering. More advanced waveguide/body coupling can follow.

Karplus–Strong alone does not justify a “realistic guzheng” claim. Instrument identity still depends on body resonance, articulation, parameter design and listening validation.

### 3. Algorithmic reverb

Implement procedural space before requiring external IR assets. Prefer a deterministic diffusion/FDN-style architecture.

Expose room size, decay, damping, pre-delay, wet/dry and diffusion where applicable.

Convolution reverb is a later engine using the external-asset infrastructure.

### 4. Granular / stochastic texture

For silk/fabric, paper, rain, sand, friction and evolving textures.

Expose grain density/duration, amplitude and spectral distributions, filtering, movement speed, contact-pressure abstraction, randomness and explicit seed.

A macro gesture should generate a deterministic population of micro-events.

### 5. Sound-event composition

Support deterministic timed sub-events so a sound can be a program rather than one synthesizer.

Example — ornate box opening:

```
0 ms      contact/friction
80 ms     hinge movement
140 ms    wooden-body resonance
420 ms    lid impact
420+ ms   body ring + room decay
```

This is required for compound Foley.

### 6. Sample source

Samples are first-class IR primitives, not a failure mode.

Expose asset reference, region, gain, pitch/playback rate, loop, envelope and optional granular/resynthesis processing. External dependencies must be represented in project/export metadata.

Hybrid synthesis is legitimate:

```
sample transient
+ procedural body resonance
+ granular texture
+ modal ringing
+ algorithmic room
```

Do not make “zero samples” a product constraint at the expense of production usefulness.

### 7. Convolution reverb

Add after asset dependency/versioning exists. Impulse responses must be explicit manifest dependencies.

## Reference implementation targets

**Guzheng-like pluck**

```
pluck exciter
→ string/delay line
→ damping/dispersion
→ bridge/body resonator
→ room
```

Eventually support bend, vibrato/glissando and repeated/tremolo articulation.

**Silk/fabric friction**

```
macro gesture
→ seeded micro-events
→ spectral variation
→ material/contact filtering
→ body/room
```

Proof is controlled, reproducible variation from material/movement parameters—not merely changing a noise cutoff.

**Ornate wooden box opening**

```
friction + hinge + wooden modal body + lid impact + room
```

Proof is explicit event composition in IR.

**Gong / struck object**

```
impact exciter
→ inharmonic modal bank
→ optional nonlinear coloration
→ room
```

Proof is explicit modal topology and decay structure.

## Sound Design Knowledge

Each family should encode more than presets:

```
identity / semantic tags
recommended topology
valid modifiers
performance/articulation
parameter constraints
known failure modes
repair preferences
validated programs
```

Example guzheng-like knowledge can describe pluck → string → body → room, modifiers such as soft/bright/muted, articulations such as bend/vibrato/glissando, safe feedback/damping bounds, and repair preferences for excessive HF, unstable decay or body resonance.

The compiler should consume this knowledge instead of accumulating hard-coded prompt branches.

## Analyzer / Repair implications

New engines require engine-aware engineering validation:

- Karplus–Strong: unstable feedback, excessive HF excitation, abnormal decay.
- Modal: runaway modes, excessive resonance, clipping, excessive tails.
- Granular: excessive density, discontinuities, DC/bias, HF accumulation.
- Reverb: tail/headroom/wet-level problems.
- Samples: missing assets, invalid regions, loop discontinuities.

This remains engineering validation, not general perceptual judgment.

## Determinism contract

Target:

```
same IR
+ same seed
+ same engine version
+ same referenced assets
= reproducible render
```

Export metadata should record IR/schema version, engine version, seeds, sample rate, referenced asset IDs/hashes and render settings.

Do not promise bit-identical cross-browser output unless measured and proven.

## Export evolution

Target package:

```
sound.wav
sound.resona.json
sound.analysis.json
sound.repair.json       // when applicable
sound.manifest.json
assets/...              // when required/permitted
```

The manifest identifies source IR, renderer version, seeds, dependencies and validation state.

## Implementation order

1. **IR architecture/versioning** — typed source/resonator/processor/space/event contracts + DSL v2 migration.
2. **Modal synthesis** — broadest immediate gain and reusable body resonance.
3. **Karplus–Strong** — plucked-string modeling and resonator validation.
4. **Algorithmic reverb** — procedural space without assets.
5. **Granular/stochastic texture** — friction/material/texture programs.
6. **Sound-event timeline** — compound Foley.
7. **Sample source + asset manifest** — hybrid production audio.
8. **Convolution reverb** — external IR support.
9. **Sound Design Knowledge expansion** — topology/modifier/constraint/repair knowledge.
10. **Validated reference library** — grow toward 100 validated sound programs.

Do not implement all engines simultaneously. Establish the IR contract first.

## Definition of done for a synthesis primitive

A primitive is not complete merely because it emits audio. Require:

- serializable/versioned IR
- deterministic rendering where applicable
- GUI or DSL editability
- compiler/knowledge integration path
- analyzer compatibility
- invalid/risky parameter handling
- WAV export
- source + analysis metadata export
- several intentionally distinct reference programs
- listening validation before realism claims

## Guardrails

- Web Audio built-ins are not the synthesis ceiling.
- Do not bolt every capability onto the old oscillator Layer.
- Do not claim realistic guzheng/silk/gong before listening validation.
- Do not inflate the library with random permutations.
- Prompt must not become a mandatory entry point.
- Preserve deterministic procedural control.
- Samples are legitimate first-class primitives.
- Do not confuse measurable validation with subjective sound quality.

## Intended transition

```
Oscillator-oriented DSP editor
        ↓
Versioned RESONA IR
        ↓
Multiple synthesis models
        ↓
Deterministic / traceable renderer
        ↓
Analyze → Validate → Repair
        ↓
Production asset package
```

The objective is not simply to add guzheng, silk or reverb. It is to let RESONA represent **different mechanisms by which sound is generated** while preserving its AI-operable audio-engineering workflow.

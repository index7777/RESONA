# RESONA — Product Scope & Execution Roadmap

> Product/implementation decision record. This document records what RESONA is being built toward and, importantly, what is **not** being pulled into the immediate implementation scope.

## Product positioning

RESONA should not be permanently defined as a game-audio generator.

Long-term:

> **RESONA is an AI-native programmable audio creation and engineering system.**

Its first high-value vertical is game audio.

```
Core product      Programmable Audio System
Near-term market  Game Audio
Near-term output  SFX + Music
Long-term output  Voice / Singing + broader audio creation
```

Game Audio is the initial application layer, not the architectural boundary.

## Core architecture principle

RESONA IR remains the center.

Natural language is one frontend. GUI, agents and APIs must be able to manipulate the same structured representation.

Renderers/backends may expand over time:

```
RESONA IR
   │
   ├─ oscillator / noise DSP
   ├─ modal synthesis
   ├─ physical modeling
   ├─ granular synthesis
   ├─ sample / hybrid synthesis
   ├─ music renderer
   └─ future neural voice renderer
```

Do not design the IR around the assumption that every sound originates from an oscillator.

## Near-term product: Game Audio

The useful unit for a game developer is not merely one generated WAV.

RESONA should eventually accept a game-audio specification such as:

```
Project: sci-fi inventory UI

Events:
- open
- close
- select
- equip
- unequip
- error

Style:
- clean
- metallic
- subtle

Constraints:
- short duration
- consistent loudness
- no clipping
- multiple controlled variations for repetitive events
```

and produce a coherent, editable and validated asset family.

### SFX workflow

```
Game Audio Request
       ↓
Audio Specification
       ↓
Sound Design Knowledge
       ↓
RESONA Sound IR
       ↓
Render
       ↓
Controlled Variations
       ↓
Analyze / Validate / Repair
       ↓
Game-ready Asset Package
```

Controlled variation is a first-class game-audio requirement. Variations should preserve material/style/event identity while allowing bounded changes in pitch, transient, texture, resonance, timing and seeded stochastic behavior.

Do not count trivial random permutations as distinct designed assets.

### Game-ready output

Target outputs include:

- WAV and eventually other appropriate game formats
- seamless loops where requested
- controlled variation sets
- stems where appropriate
- source RESONA IR
- analysis/validation evidence
- deterministic seeds
- manifest and event metadata
- engine-friendly naming

A future package may map game events to assets and selection behavior such as random-no-repeat.

## Music must have its own IR

Do not force music into Sound IR.

Introduce a future **Music IR** responsible for composition and arrangement:

```
MusicProject
├─ tempo / key / meter
├─ sections
├─ tracks
├─ harmony
├─ melody
├─ rhythm
├─ automation
├─ transitions
├─ loop points
├─ intensity
└─ seed
```

Music instruments may reference RESONA sound programs.

```
Music IR
   ↓
Composition / Arrangement
   ↓
RESONA Sound Programs
   ↓
Renderer
```

This allows existing sound-engine work to become the instrument layer of the music system rather than a separate dead end.

## Game music should support adaptive structure

The goal is not only prompt → finished background WAV.

Future game-oriented music should support concepts such as:

- loop-safe sections
- stems
- exploration / tension / combat / victory states
- vertical remixing
- horizontal resequencing
- transition/stinger assets
- intensity parameters

Conceptually:

```
Game State
    ↓
Audio Rules
    ↓
Music IR / Sound IR parameters
    ↓
Rendered assets or future runtime
```

This is a later capability, but the architecture should not block it.

## Three delivery levels

### Level 1 — Rendered Assets

The first practical delivery target.

```
WAV
loops
variations
music stems
source IR
metadata
```

### Level 2 — Game Audio Package

A coherent package containing categorized assets, manifests, event mappings, validation metadata and source programs.

### Level 3 — RESONA Runtime

Longer-term possibility:

```ts
resona.set("combatIntensity", 0.8)
resona.trigger("weapon.fire")
resona.trigger("footstep", { material: "stone" })
```

The runtime could choose variations, alter procedural parameters and control adaptive music.

**Do not implement Runtime before the asset/compiler workflow is proven.**

## AI's role

The agent should eventually operate at project scope, not only single-prompt scope.

Example future workflow:

```
read game audio specification
→ build asset plan
→ select sound/music design knowledge
→ construct Sound IR / Music IR
→ render
→ analyze
→ validate
→ repair measurable failures
→ check diversity
→ validate loops
→ normalize/align asset family
→ export game audio package
```

The differentiator is the engineering workflow and editable source, not merely generation.

## Long-term: RESONA Voice / Singing

RESONA should preserve a long-term path toward having its own identifiable singing voice.

This is **not an immediate implementation target**.

A real RESONA Voice should eventually mean more than calling an external lyrics-to-WAV API. The intended architecture is:

```
Music IR
│
├─ melody
├─ rhythm
└─ lyrics
      ↓
Singing Performance IR
│
├─ phoneme timing
├─ pitch trajectory
├─ vibrato
├─ dynamics
├─ breath
└─ articulation
      ↓
RESONA Voice Model
│
├─ voice/timbre identity
├─ phoneme generation
└─ acoustic/vocoder model
      ↓
Voice Renderer
      ↓
Singing Audio
```

Music and voice can later converge:

```
             Music IR
                │
      ┌─────────┴─────────┐
      │                   │
Instrument Tracks      Vocal Track
      │                   │
Sound Programs       Singing IR
      │                   │
DSP Renderer        RESONA Voice
      └─────────┬─────────┘
                ↓
               Mix
                ↓
         Analyze / Master
                ↓
             Export
```

A versioned voice identity such as `RESONA Voice v1` may eventually become a product asset, subject to the required model/data/licensing work.

Do not let this long-term goal delay the near-term Sound IR, synthesis, SFX and music foundations.

## Execution order

The immediate implementation order remains compatible with `SYNTHESIS_ARCHITECTURE.md`:

1. **Next-generation RESONA IR architecture/versioning**
2. **Modal synthesis**
3. **Karplus–Strong / plucked-string synthesis**
4. **Algorithmic reverb**
5. **Granular / stochastic texture synthesis**
6. **Sound-event timeline/composition**
7. **Sample source + asset manifest**
8. **Convolution reverb**
9. **Sound Design Knowledge expansion**
10. **Validated sound-program library**

After the sound foundation is proven, the next product layer is:

11. **Game Audio Specification / asset-family model**
12. **Controlled variation system**
13. **Game-ready package/export contract**
14. **Music IR**
15. **Loop/stem-aware music generation**
16. **Adaptive game-music structures**
17. **Game-engine integration / event mapping**
18. **Only then evaluate a RESONA Runtime**

Long-term research/product track, deliberately outside the immediate sequence:

19. **Singing Performance IR**
20. **RESONA Voice model / voice identity**
21. **Music + vocal integration**

## Guardrails

- Game Audio is the first vertical, not RESONA's permanent boundary.
- Do not reduce RESONA to prompt → WAV.
- Sound IR remains central for sound programs.
- Music receives a separate Music IR rather than abusing Sound IR.
- Future voice receives a structured performance representation rather than becoming an opaque exception.
- Preserve deterministic/traceable behavior where applicable.
- Prefer game-ready families, variations, loops, stems and metadata over isolated demo sounds.
- Do not implement Runtime before asset generation/export is useful.
- Do not implement singing now.
- Do not claim proprietary RESONA singing voice until an actual owned/authorized voice model and rendering stack exist.

## Product trajectory

```
NOW
RESONA IR
→ richer synthesis
→ production SFX foundation

NEXT
Game Audio Compiler
→ asset families
→ controlled variations
→ loops/stems
→ Music IR
→ adaptive music
→ engine integration

LATER
RESONA Runtime
→ game-state-driven procedural/adaptive audio

FUTURE
RESONA Voice
→ Singing Performance IR
→ identifiable voice model
→ music + vocal generation
```

The immediate objective is still to strengthen the sound representation and renderer. The broader direction is to make RESONA capable of creating, engineering and delivering programmable audio—not merely synthesizing individual sounds.

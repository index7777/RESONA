# RESONA IR v3 — Physical sound programs

IR v3 (`"version": 3`) is the typed, composable program format described in `SYNTHESIS_ARCHITECTURE.md`. DSL v2 remains supported; the Sound Lab, Inspector, Layer Attribution, Auto-Fix, Agent Optimize and Export accept both.

## Shape

```
program  { version:3, seed, name, sampleRate?, variants?, voices[], processors[], master }
voice    { id, at?, gain?, duration?, mute?, source, envelope[]?, processors[]? }
source   modal | pluck | noise | grains | group
```

- **modal** — resonant partial bank with per-mode decay/bloom plus pitch trajectory, glide and vibrato.
- **pluck** — Karplus–Strong string with frequency, damping, brightness and pick position.
- **noise** — deterministic seeded noise.
- **grains** — deterministic band-limited micro-events for paper, sparks, rattle and textures.
- **group** — child voices on a timeline; this is the compound sound-event layer.

Processors include Butterworth filters, STFT spectral sweep, envelopes, gain, saturation, random AM, parallel chains and a seeded procedural convolution room.

## Determinism and variants

Scalars may be fixed values, `{"range":[a,b]}` or `{"choice":[...]}`. Each voice uses a deterministic RNG stream derived from the program seed and tree path. Variant *n* renders from `seed + n`.

The renderer in `src/engine/` is pure TypeScript and does not depend on Web Audio for synthesis.

## Batch rendering

```
npm run render -- --library
npm run render -- gong drum --variants 3 --sr 44100
npm run render -- my-sound.resona.json --out sfx
```

Node ≥22.6 is required for TypeScript type stripping.

## Physical reference library

The initial library contains 24 physical/procedural programs: Wood Tap Click, Paper Hover, Card Select/Draw/Place/Flip, Cloth Whoosh, Seal Stamp, War Drum, Gong, Blade Slash, Body Hit, Heavy Hit, Blade Clash, Shield Block, Bianzhong Heal, Fire Attack, Thunder, Guqin Harmonic, Fallen General, Heartbeat, Victory Sting, Defeat Sting and War Horn.

These are engineering reference programs, not claims of perceptual realism. Listening validation remains required before realism claims.

The prompt compiler routes physical vocabulary such as gong/鑼, bell/編鐘, drum/戰鼓, guzheng/古琴/pluck, paper/card, blade/slash, fire, thunder and horn to IR v3 programs before legacy synth archetypes.

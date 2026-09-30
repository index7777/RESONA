# RESONA

RESONA is a browser-first programmable sound studio for developers.

The goal is to let developers and coding agents create, inspect, iterate, and export game/app audio directly from structured sound definitions.

## First milestone

- Browser synth engine using Web Audio API
- Oscillators: sine, square, sawtooth, triangle, noise
- ADSR envelope
- Biquad filter
- Live waveform display
- One-shot SFX generation
- WAV export
- Deterministic JSON sound definition format
- No GitHub Actions / CI / QA / PR workflow automation

## Direction

Prompt / code -> sound definition -> DSP graph -> preview -> analysis -> export.

The initial implementation stays intentionally small and local-first so Codex or another coding agent can reason about and modify every layer of the audio pipeline.


## IR v3 physical engines (v0.2.0)

RESONA now supports typed `"version": 3` sound programs alongside DSL v2: modal synthesis, Karplus–Strong strings, spectral sweeps, stochastic grains, procedural room processing and timeline groups for compound events. A 24-program physical reference library is exposed in Sound Lab, and `npm run render` batch-renders programs from Node. See `docs/IR_V3.md`.

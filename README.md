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

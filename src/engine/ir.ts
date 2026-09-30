// RESONA IR v3 — typed, composable sound programs.
//
// A program is a tree of voices. Every voice has one Source (how the sound is
// generated), optional amplitude Envelopes, and an ordered chain of Processors
// (filters, spectral sweeps, modulation, parallel branches and Space/room).
// A `group` source mixes child voices on a timeline (`at`), which is how compound
// Foley and multi-event sounds are expressed.
//
// Any scalar marked `Num` may be a fixed number, `{range:[a,b]}` or `{choice:[...]}`.
// Ranges/choices are resolved deterministically from the program seed and the
// voice path, so `seed`, `seed+1`, `seed+2`… give reproducible variants.

export type Num = number | { range: [number, number] } | { choice: number[] };

export type Mode = {
  ratio: number;
  gain: number;
  decay?: number | null;
  bloom?: number;
  phase?: number;
};

export type ModalSource = {
  type: 'modal'; freq: Num; modes?: Mode[];
  harmonics?: { count: number; rolloff: number; decay?: number | null };
  jitter?: number; gainJitter?: number; decayJitter?: number; attack?: number;
  randomPhase?: boolean;
  pitch?: { amount: Num; decay: Num };
  glide?: { from: Num; time: Num };
  vibrato?: { rate: Num; depth: Num; fadeIn?: Num };
};

export type PluckSource = {
  type: 'pluck'; freq: Num; damping?: Num; brightness?: Num; pick?: Num; attack?: number;
};

export type NoiseSource = { type: 'noise'; color?: 'white' | 'uniform' };

export type GrainsSource = {
  type: 'grains'; rate: Num; grainDuration: [number, number];
  freq: [number, number]; gain: [number, number];
};

export type GroupSource = { type: 'group'; voices: Voice[] };
export type Source = ModalSource | PluckSource | NoiseSource | GrainsSource | GroupSource;

export type Envelope =
  | { type: 'exp'; decay: Num; attack?: Num }
  | { type: 'window'; shape: 'hann' | 'sine'; power?: Num }
  | { type: 'gauss'; center: Num; width: Num }
  | { type: 'ar'; attack: Num; release: Num }
  | { type: 'tailFade'; fraction: Num };

export type FilterMode = 'lowpass' | 'highpass' | 'bandpass';

export type Processor =
  | { type: 'filter'; mode: FilterMode; freq: Num; freq2?: Num; order?: number }
  | { type: 'sweep'; from: Num; to: Num; bandwidth: Num }
  | { type: 'envelope'; envelope: Envelope }
  | { type: 'gain'; value: Num }
  | { type: 'saturate'; drive: Num }
  | { type: 'randomAM'; rate: Num; floor: Num }
  | { type: 'parallel'; branches: { gain: Num; processors: Processor[] }[] }
  | { type: 'room'; size: Num; wet: Num; brightness?: Num; preDelay?: Num };

export type Voice = {
  id: string; at?: Num; gain?: Num; duration?: Num; mute?: boolean;
  source: Source; envelope?: Envelope[]; processors?: Processor[];
};

export type Master = {
  gain?: number; normalize?: number | null; dcRemove?: boolean;
  fadeOutMs?: number; trimDb?: number | null;
};

export type SoundProgram = {
  version: 3; seed: number; name: string; family?: string; tags?: string[];
  sampleRate?: number; variants?: number; voices: Voice[];
  processors?: Processor[]; master: Master;
};

export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export type SoundDefinition = {
  name: string;
  waveform: Waveform;
  frequency: number;
  duration: number;
  gain: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterFrequency: number;
  filterQ: number;
};

export const defaultSound: SoundDefinition = {
  name: 'Neon Confirm',
  waveform: 'sawtooth',
  frequency: 440,
  duration: 0.85,
  gain: 0.28,
  attack: 0.01,
  decay: 0.18,
  sustain: 0.42,
  release: 0.3,
  filterFrequency: 2400,
  filterQ: 4,
};

function scheduleEnvelope(
  gain: AudioParam,
  start: number,
  definition: SoundDefinition,
) {
  const { attack, decay, sustain, release, duration, gain: peak } = definition;
  const attackEnd = start + Math.max(0.001, attack);
  const decayEnd = attackEnd + Math.max(0.001, decay);
  const sustainEnd = Math.max(decayEnd, start + duration - release);
  const end = start + duration;

  gain.cancelScheduledValues(start);
  gain.setValueAtTime(0.0001, start);
  gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), attackEnd);
  gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sustain), decayEnd);
  gain.setValueAtTime(Math.max(0.0001, peak * sustain), sustainEnd);
  gain.exponentialRampToValueAtTime(0.0001, end);
}

export function playSound(
  context: AudioContext,
  definition: SoundDefinition,
  analyser?: AnalyserNode,
) {
  const osc = context.createOscillator();
  const filter = context.createBiquadFilter();
  const amp = context.createGain();

  osc.type = definition.waveform;
  osc.frequency.value = definition.frequency;

  filter.type = 'lowpass';
  filter.frequency.value = definition.filterFrequency;
  filter.Q.value = definition.filterQ;

  const now = context.currentTime;
  scheduleEnvelope(amp.gain, now, definition);

  osc.connect(filter);
  filter.connect(amp);

  if (analyser) {
    amp.connect(analyser);
    analyser.connect(context.destination);
  } else {
    amp.connect(context.destination);
  }

  osc.start(now);
  osc.stop(now + definition.duration + 0.02);
}

export async function renderSound(definition: SoundDefinition) {
  const sampleRate = 48000;
  const length = Math.ceil(sampleRate * (definition.duration + 0.05));
  const context = new OfflineAudioContext(1, length, sampleRate);
  const osc = context.createOscillator();
  const filter = context.createBiquadFilter();
  const amp = context.createGain();

  osc.type = definition.waveform;
  osc.frequency.value = definition.frequency;
  filter.type = 'lowpass';
  filter.frequency.value = definition.filterFrequency;
  filter.Q.value = definition.filterQ;

  scheduleEnvelope(amp.gain, 0, definition);
  osc.connect(filter);
  filter.connect(amp);
  amp.connect(context.destination);
  osc.start(0);
  osc.stop(definition.duration + 0.02);

  return context.startRendering();
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

export function audioBufferToWav(buffer: AudioBuffer) {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < frames; i += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function exportWav(definition: SoundDefinition) {
  const rendered = await renderSound(definition);
  const blob = audioBufferToWav(rendered);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${definition.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'resona-sound'}.wav`;
  anchor.click();
  URL.revokeObjectURL(url);
}

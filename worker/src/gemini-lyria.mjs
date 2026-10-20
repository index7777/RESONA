import { ProviderError } from './stability-audio.mjs';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';

function buildPrompt(prompt, durationSeconds, variant) {
  const take = variant === 1
    ? 'Take 1: make the main theme memorable and immediately recognizable.'
    : 'Take 2: create a clearly different alternate arrangement and melodic contour.';
  const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const introEnd = Math.max(1, Math.round(durationSeconds * 0.2));
  const peakEnd = Math.max(introEnd + 1, Math.round(durationSeconds * 0.8));
  const sections = [
    `[${formatTime(0)} - ${formatTime(introEnd)}] establish the scene and musical motif`,
    `[${formatTime(introEnd)} - ${formatTime(peakEnd)}] develop the motif with the main energy and instrumentation`,
    `[${formatTime(peakEnd)} - ${formatTime(durationSeconds)}] resolve with a concise, loop-friendly ending, not a long fade`,
  ].join('; ');
  return `${prompt}. Instrumental video-game background music only; no vocals or lyrics. Aim for approximately ${durationSeconds} seconds; use these requested section timings as arrangement guidance: ${sections}. Return the complete musical result without trimming or claiming an exact duration. Make the ending feel compatible with restarting the cue, but do not claim a seamless loop. ${take}`;
}

function readAudioData(payload) {
  if (typeof payload?.output_audio?.data === 'string') return payload.output_audio.data;
  for (const step of payload?.steps || []) {
    if (step?.type !== 'model_output') continue;
    for (const block of step.content || []) {
      if (block?.type === 'audio' && typeof block.data === 'string') return block.data;
    }
  }
  return null;
}

export async function generateGeminiBgm(env, { prompt, durationSeconds, variant = 1, fetchImpl = fetch }) {
  if (!env.GEMINI_API_KEY) throw new ProviderError('PROVIDER_NOT_CONFIGURED', { definitive: true });
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        model: 'lyria-3.5',
        input: buildPrompt(prompt, durationSeconds, variant),
      }),
    });
  } catch {
    throw new ProviderError('PROVIDER_OUTCOME_UNKNOWN');
  }

  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) throw new ProviderError('PROVIDER_OUTCOME_UNKNOWN');
    throw new ProviderError('PROVIDER_REJECTED', { definitive: true });
  }

  const payload = await response.json().catch(() => null);
  const encoded = readAudioData(payload);
  if (!encoded || encoded.length > 80_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    throw new ProviderError('PROVIDER_BAD_AUDIO');

  let audio;
  try {
    const binary = atob(encoded);
    audio = Uint8Array.from(binary, character => character.charCodeAt(0)).buffer;
  } catch {
    throw new ProviderError('PROVIDER_BAD_AUDIO');
  }
  if (!audio.byteLength) throw new ProviderError('PROVIDER_BAD_AUDIO');
  return { audio, contentType: 'audio/mpeg' };
}

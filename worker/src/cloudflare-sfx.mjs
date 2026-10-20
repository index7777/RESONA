import { ProviderError } from './stability-audio.mjs';

const MAX_AUDIO_BYTES = 12_000_000;

export async function generateCloudflareSfx(env, { prompt, durationSeconds, variant = 1, fetchImpl }) {
  if (!env.SFX_CONTAINER) throw new ProviderError('PROVIDER_NOT_CONFIGURED', { definitive: true });
  const stub = env.SFX_CONTAINER.getByName('stable-audio-small-sfx');
  const invoke = fetchImpl || ((input, init) => stub.fetch(input, init));
  let response;
  try {
    response = await invoke('https://sfx.internal/v1/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, durationSeconds, variant }),
    });
  } catch {
    throw new ProviderError('PROVIDER_OUTCOME_UNKNOWN');
  }
  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) throw new ProviderError('PROVIDER_OUTCOME_UNKNOWN');
    throw new ProviderError('PROVIDER_REJECTED', { definitive: true });
  }
  const contentType = response.headers.get('content-type')?.split(';')[0].trim();
  if (contentType !== 'audio/wav') throw new ProviderError('PROVIDER_BAD_AUDIO');
  const audio = await response.arrayBuffer().catch(() => null);
  if (!audio?.byteLength || audio.byteLength > MAX_AUDIO_BYTES) throw new ProviderError('PROVIDER_BAD_AUDIO');
  const header = new Uint8Array(audio, 0, Math.min(audio.byteLength, 12));
  if (header.length < 12 || String.fromCharCode(...header.subarray(0, 4)) !== 'RIFF' || String.fromCharCode(...header.subarray(8, 12)) !== 'WAVE')
    throw new ProviderError('PROVIDER_BAD_AUDIO');
  const measuredDuration = Number(response.headers.get('x-generation-duration-seconds'));
  return { audio, contentType, durationSeconds: Number.isFinite(measuredDuration) && measuredDuration > 0 ? measuredDuration : null };
}

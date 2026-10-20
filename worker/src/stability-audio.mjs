const API = 'https://api.stability.ai/v2beta/audio/stable-audio/text-to-audio';
const RESULTS = 'https://api.stability.ai/v2beta/audio/results/';

export class ProviderError extends Error {
  constructor(code, { definitive = false } = {}) { super(code); this.code = code; this.definitive = definitive; }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function shapedPrompt(kind, prompt, variant) {
  const variation = variant === 1 ? 'Variation 1: favor a clear, immediately readable primary motif.' : 'Variation 2: create a distinct alternate take with different timing and texture.';
  if (kind === 'sfx') return `${prompt}. Naturalistic, physically plausible sound design with organic source detail and a clean transient/decay. Avoid generic synthetic beeps or stock-like UI tones unless explicitly requested. ${variation}`;
  return `${prompt}. Instrumental game soundtrack, production-ready arrangement with a clear emotional arc and no vocals. ${variation}`;
}

export async function generateStabilityAudio(env, { kind, prompt, durationSeconds, variant = 1, fetchImpl = fetch, pollDelayMs = 1000, maxPolls = 90 }) {
  if (!env.STABILITY_API_KEY) throw new ProviderError('PROVIDER_NOT_CONFIGURED', { definitive: true });
  const form = new FormData();
  form.set('prompt', shapedPrompt(kind, prompt, variant));
  form.set('model', 'stable-audio-3');
  form.set('duration', String(durationSeconds));
  form.set('output_format', 'mp3');
  form.set('steps', '8');

  let started;
  try {
    started = await fetchImpl(API, { method: 'POST', headers: { authorization: `Bearer ${env.STABILITY_API_KEY}`, accept: 'application/json' }, body: form });
  } catch { throw new ProviderError('PROVIDER_OUTCOME_UNKNOWN'); }
  if (started.status !== 202) {
    if (started.status >= 500 || started.status === 429) throw new ProviderError('PROVIDER_OUTCOME_UNKNOWN');
    throw new ProviderError('PROVIDER_REJECTED', { definitive: true });
  }
  const { id } = await started.json().catch(() => ({}));
  if (typeof id !== 'string' || !/^[a-f0-9]{32,80}$/i.test(id)) throw new ProviderError('PROVIDER_BAD_RESPONSE');

  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    await wait(pollDelayMs);
    let result;
    try {
      result = await fetchImpl(RESULTS + encodeURIComponent(id), {
        method: 'GET', headers: { authorization: `Bearer ${env.STABILITY_API_KEY}`, accept: 'audio/*' },
      });
    } catch { throw new ProviderError('PROVIDER_OUTCOME_UNKNOWN'); }
    if (result.status === 202) continue;
    if (result.status !== 200) {
      if (result.status >= 500 || result.status === 429) throw new ProviderError('PROVIDER_OUTCOME_UNKNOWN');
      throw new ProviderError('PROVIDER_REJECTED', { definitive: true });
    }
    const audio = await result.arrayBuffer();
    const contentType = result.headers.get('content-type')?.split(';')[0] || 'audio/mpeg';
    if (!audio.byteLength || !['audio/mpeg','audio/wav'].includes(contentType)) throw new ProviderError('PROVIDER_BAD_AUDIO');
    return { audio, contentType, providerJobId: id };
  }
  throw new ProviderError('PROVIDER_OUTCOME_UNKNOWN');
}

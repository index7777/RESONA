import { handleAudioApi } from './api.mjs';
import { authenticateRes } from './res-auth.mjs';
export { SfxModelContainer } from './sfx-container.mjs';

export default {
  async fetch(request, env) {
    return handleAudioApi(request, env, authenticateRes);
  },
};

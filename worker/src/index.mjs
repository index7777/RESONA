import { handleAudioApi } from './api.mjs';

async function authenticate() {
  // RES private session verifier is not implemented yet.
  // Deny all protected endpoints rather than trust a browser user ID.
  throw new Error('RES identity bridge not configured');
}

export default {
  async fetch(request, env) {
    return handleAudioApi(request, env, authenticate);
  },
};

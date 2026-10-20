import { DurableObject } from 'cloudflare:workers';

const PORT = 8080;
const STARTUP_TIMEOUT_MS = 120_000;
const RETRY_MS = 1_000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export class SfxModelContainer extends DurableObject {
  async ensureReady() {
    const container = this.ctx.container;
    if (!container) throw new Error('SFX container binding is unavailable');
    if (!container.running) {
      container.start({
        image: container.images.base,
        instance: 'standard-4',
        enableInternet: true,
        env: { HF_TOKEN: this.env.HF_TOKEN || '' },
      });
      await container.setInactivityTimeout(120_000);
    }

    const port = container.getTcpPort(PORT);
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const response = await port.fetch('http://container/health');
        if (response.ok) return port;
      } catch {
        // The Container process may still be starting; retry until timeout.
      }
      await sleep(RETRY_MS);
    }
    throw new Error('SFX inference container did not become ready');
  }

  async fetch(request) {
    const incoming = new URL(request.url);
    if (incoming.pathname !== '/health' && incoming.pathname !== '/v1/generate')
      return Response.json({ code: 'NOT_FOUND' }, { status: 404 });
    if (incoming.pathname === '/v1/generate' && request.method !== 'POST')
      return Response.json({ code: 'METHOD_NOT_ALLOWED' }, { status: 405 });

    try {
      const port = await this.ensureReady();
      const target = new URL(incoming.pathname, `http://container:${PORT}`);
      return await port.fetch(new Request(target, request));
    } catch {
      return Response.json({ code: 'SFX_CONTAINER_UNAVAILABLE' }, { status: 503, headers: { 'cache-control': 'no-store' } });
    }
  }
}

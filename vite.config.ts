import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // This application is served under /audio on the RES domain and on its
  // isolated preview Worker. Keep dev/preview/build URLs aligned with that
  // mount point so asset paths match Cloudflare's nested static assets.
  base: '/audio/',
  build: { outDir: 'dist/audio' },
  plugins: [react()],
});

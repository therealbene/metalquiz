import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { discogsProxyPlugin } from './server/viteDiscogsProxy';

export default defineConfig(({ mode }) => {
  // Empty prefix: also load non-VITE_ variables. DISCOGS_TOKEN stays on the server and is never bundled.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), discogsProxyPlugin(env.DISCOGS_TOKEN)],
    test: { environment: 'node', include: ['src/**/*.test.ts', 'server/**/*.test.ts', 'functions/**/*.test.ts'] },
  };
});

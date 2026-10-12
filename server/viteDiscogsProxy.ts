import type { Plugin } from 'vite';
import { handleDiscogsRequest, PROXY_PREFIX } from './discogsProxy';

/** Serves the same proxy handler from the Vite dev server, reading DISCOGS_TOKEN from .env.local. */
export function discogsProxyPlugin(token: string | undefined): Plugin {
  return {
    name: 'discogs-proxy',
    configureServer(server) {
      server.middlewares.use(PROXY_PREFIX, async (req, res) => {
        const url = new URL(`${PROXY_PREFIX}${req.url ?? ''}`, `http://${req.headers.host ?? 'localhost'}`);
        const response = await handleDiscogsRequest(new Request(url, { method: req.method }), token);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
    },
  };
}

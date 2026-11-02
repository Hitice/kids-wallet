import { createHash } from 'node:crypto';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { ResolvedConfig } from 'vite';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Content Security Policy for the production build. The only network peer
 * is the public mempool.space API. It is not added in development because
 * the dev server injects inline scripts for hot reload.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  'connect-src https://mempool.space',
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'kids-wallet-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

/**
 * bip39 requires all ten wordlists inside try/catch blocks so bundles can
 * leave out the ones they do not need (see the bip39 README). The app only
 * uses English, so the other lists are replaced by a module that throws.
 */
function englishWordlistOnly(): Plugin {
  const EXCLUDED = '\0bip39-excluded-wordlist';
  return {
    name: 'kids-wallet-bip39-english-only',
    apply: 'build',
    enforce: 'pre',
    resolveId(source, importer) {
      if (importer?.includes('bip39') && /^\.\/wordlists\/(?!english\.json$).+\.json$/.test(source)) {
        return EXCLUDED;
      }
      return null;
    },
    load(id) {
      return id === EXCLUDED ? 'throw new Error("Only the English BIP39 wordlist is bundled.");' : null;
    },
  };
}

/** Files from public/ that the service worker caches besides the bundle. */
const PUBLIC_FILES = ['favicon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

/**
 * Emits a minimal service worker (dist/sw.js) that precaches the app shell so
 * the installed app opens offline. It only answers same-origin GET requests;
 * everything else, in particular mempool.space, goes straight to the network.
 * The cache name changes with the file list, so a new build replaces the old
 * shell on the next load.
 */
function serviceWorker(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'kids-wallet-service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    generateBundle(_options, bundle) {
      const base = config.base.endsWith('/') ? config.base : `${config.base}/`;
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'index.html');
      const precache = [base, ...[...files, ...PUBLIC_FILES].map((f) => `${base}${f}`)];
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12);
      const source = `// Kids Wallet service worker. Generated at build time; do not edit.
const CACHE = 'kids-wallet-${version}';
const SHELL = ${JSON.stringify(base)};
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('kids-wallet-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Only the app's own files are served from the cache. mempool.space is never cached.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.match(SHELL).then((hit) => hit || fetch(request)));
    return;
  }
  if (!PRECACHE.includes(url.pathname)) return;
  event.respondWith(caches.match(url.pathname).then((hit) => hit || fetch(request)));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), contentSecurityPolicy(), englishWordlistOnly(), serviceWorker()],
  // Local dev and preview serve from "/". The GitHub Pages workflow sets KIDS_WALLET_BASE=/kids-wallet/.
  base: process.env.KIDS_WALLET_BASE ?? '/',
  build: {
    target: 'es2022',
    sourcemap: true,
    // React, the Bitcoin libraries and the landing page come to about 670 kB minified (210 kB gzip) in one chunk.
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});

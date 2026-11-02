import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
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

export default defineConfig({
  plugins: [react(), tailwindcss(), contentSecurityPolicy(), englishWordlistOnly()],
  // Relative asset paths so the build also works from a sub-path (for example GitHub Pages).
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
    // React plus the Bitcoin libraries come to about 620 kB minified (195 kB gzip) in one chunk.
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});

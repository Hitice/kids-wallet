# RFC 0008: Platforms and PWA

Status: In development

Files: `public/manifest.webmanifest`, `public/icon-*.png`, the service worker plugin in `vite.config.ts`, the registration in `src/main.tsx`, `.github/workflows/pages.yml`

## Summary

Kids Wallet runs on tablet, phone and web. The first target is the web app
installed as a Progressive Web App: one code base, no app store review, works
offline for everything that does not need the network. Native or Flutter
clients that read the same vault descriptor are a contribution track.

## Motivation

Families use whatever device is at home, often a shared tablet. A PWA installs
on Android, iOS, iPadOS, ChromeOS and desktop browsers from a link, and updates
without a store. Keys and secrets never depend on the platform: the vault file
is plain JSON with public data, so any client can read it.

## Design

### Done

- Web app manifest with name, theme, standalone display and icons (192, 512,
  and a maskable 512).
- A minimal service worker, generated at build time, that precaches the app
  shell and the bundle. It only answers same-origin GET requests; requests to
  mempool.space always go to the network and are never cached. The cache name
  changes with the bundle, so a new deploy replaces the old shell.
- The production Content Security Policy is kept and extended only with
  `worker-src 'self'` and `manifest-src 'self'`. `connect-src` still allows
  only `https://mempool.space`.
- GitHub Pages deploy on push to main, at `https://hitice.github.io/kids-wallet/`.
  The Vite `base` is `/kids-wallet/` only for that build (environment variable
  `KIDS_WALLET_BASE`); local dev and preview use `/`. Hash routing means
  every route works on Pages without a 404 fallback.

### Not done

- An install prompt in the UI.
- Offline lessons beyond the bundled ones.
- Native clients. A Flutter or native client must:
  - read and write the vault descriptor of RFC 0001 (and of RFC 0002 once
    defined) and reject files whose script or address do not match,
  - use the platform's secure key storage with biometric access control
    ([RFC 0004](0004-device-biometrics-and-passkeys.md)),
  - talk only to a public block explorer API or the user's own node.

## Enforced by code vs by governance

| Rule | Enforced by |
| --- | --- |
| Only mempool.space is contacted | CSP `connect-src` in the production build |
| The service worker never caches API data | Service worker code (same-origin filter) |
| Secrets are never written to storage, including the cache | Client code; the cache holds only build files |

## Open questions

1. iOS limits for PWAs (storage eviction, WebAuthn PRF support). Is a native
   iOS client needed earlier than Android?
2. Flutter or native per platform for the contribution track?
3. Should installed clients pin the Pages origin, or allow self-hosting?

## History

- 2026-11-02: manifest, service worker, icons and Pages workflow.

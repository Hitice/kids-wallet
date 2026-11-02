## What this changes

<!-- One topic per pull request. Link the issue and the RFC. -->

Issue:
RFC:

## Enforced by code or by governance

<!-- Which rules does this change enforce in the script or the client, and which stay governance? -->

## How it was tested

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Regtest or signet, if it touches scripts or transactions

## Checklist

- [ ] Test networks only. Nothing reaches mainnet.
- [ ] No secrets in code, fixtures, logs or storage (only the public BIP39 test mnemonics in tests).
- [ ] `src/core/` still has no React, window, document or fetch.
- [ ] No new network peer, or an RFC for it.
- [ ] The RFC is updated in this pull request if a rule, script or key changed.
- [ ] If an area changed status, `src/content/status.ts` and the README table are updated.
- [ ] Plain ASCII, no em dashes, no emojis.

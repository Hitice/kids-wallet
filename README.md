# Kids Wallet

[![CI](https://github.com/Hitice/kids-wallet/actions/workflows/ci.yml/badge.svg)](https://github.com/Hitice/kids-wallet/actions/workflows/ci.yml)

Bitcoin Is Everyone's Legacy.

Kids Wallet is an open-source project in public design. Parents, grandparents
and friends save bitcoin for a child in a vault that only the child can open,
at 18. The app grows with the child, an AI tutor walks beside them, and the
rules of the vault are written in Bitcoin script, not in anyone's goodwill.

**Demo: [hitice.github.io/kids-wallet](https://hitice.github.io/kids-wallet/)**
(signet and testnet only, coins have no value).

Start with the [vision](docs/VISION.md), the [RFCs](docs/rfcs/) and the
[roadmap](docs/ROADMAP.md).

| Phone (390 px) | Desktop (1280 px) |
| --- | --- |
| ![Landing page at phone width](docs/screenshots/landing-390.png) | ![Landing page at desktop width](docs/screenshots/landing-1280.png) |

## Grows with the child

| Age | What the child sees |
| --- | --- |
| 6 to 9 | Cartoons and mini-games. A treasure chest that fills up. |
| 10 to 13 | Challenges and quizzes. A first growth ceremony at 12. |
| 14 to 17 | Real-world money: budgets, a first job, scams, self-custody. A second growth ceremony at 16. |
| 18 | A hand-over ceremony. The child receives full control. |

Lessons and games come from community-maintained, versioned
[content packs](content/README.md). The app runs on tablet, phone and web as
a PWA.

## Security premise

- **The script governs the funds.** Not the parents, not the company, not the
  AI. Parents have no spend path at all; anyone can deposit.
- **The child path opens at 18,** enforced by `OP_CHECKLOCKTIMEVERIFY` on the
  Bitcoin network.
- **A lost key does not lose the savings.** The child's key is a FROST
  threshold key whose shares shift toward the child at growth ceremonies. If
  every share is lost, 2 of 3 independent guardians can move the coins after a
  long delay, by policy only to a pre-committed list of children's charities.
  The script enforces the 2 of 3 and the delay; the destination is enforced by
  pre-signed transactions and published governance, because Bitcoin has no
  covenants yet ([RFC 0007](docs/rfcs/0007-charity-fallback.md)).
- **Biometrics unlock the device, never the vault.** They are not key material
  and never leave the device: a biometric template is not secret and cannot be
  changed if leaked, and a sensor reading is never bit-identical twice, while a
  key must be ([RFC 0004](docs/rfcs/0004-device-biometrics-and-passkeys.md)).
- **The tutor never holds keys and never sees secrets.** It teaches and runs the
  ceremony screens; the script releases the funds
  ([RFC 0005](docs/rfcs/0005-ai-tutor-by-age-band.md)).

## Status

Generated from `src/content/status.ts`, the same source as the landing page. A
test fails if this table and the source differ.

| Area | Status | Notes | RFC |
| --- | --- | --- | --- |
| Vault v0: P2WSH, parent path and child path after 18 | Ready | Educational prototype that proved the core. Signet and testnet only. To be superseded by v1. | [0001](docs/rfcs/0001-vault-v0.md) |
| Web app: create, import, deposit, withdraw | Ready | Keys stay in the browser. The only network peer is mempool.space. |  |
| Six lessons for children and parents | Ready | Learn page in the app and the first English content pack. |  |
| Vault v1: Taproot with a guardian recovery leaf | In development | Script builder, address derivation and control blocks in src/core/taproot.ts with tests. No spending code and no UI yet. | [0002](docs/rfcs/0002-vault-v1-taproot-guardians.md) |
| Install on tablet and phone (PWA) | In development | Web manifest and offline shell. Native clients are a contribution track. | [0008](docs/rfcs/0008-platforms-pwa.md) |
| Threshold child key and growth ceremonies | Open for contribution | FROST shares that shift toward the child at 12 and 16, then the hand-over at 18. | [0003](docs/rfcs/0003-threshold-child-key-and-growth-ceremonies.md) |
| Device biometrics and passkeys | Open for contribution | Unlock and authorize on the device. Never key material. | [0004](docs/rfcs/0004-device-biometrics-and-passkeys.md) |
| AI tutor by age band | Open for contribution | Persona, prompts and a scripted demo exist. No model integration yet. | [0005](docs/rfcs/0005-ai-tutor-by-age-band.md) |
| Content packs and translations | Open for contribution | Format, schema and example pack exist. pt-BR is the first community track. | [0006](docs/rfcs/0006-content-packs-and-community.md) |
| Charity fallback | Open for contribution | Pre-signed transactions to a pre-committed list. Charities to be confirmed. | [0007](docs/rfcs/0007-charity-fallback.md) |
| Flutter or native client on the same vault descriptor | Open for contribution | Read the vault file, show the balance, sign on the device. |  |
| Mini-games for ages 6 to 9 | Open for contribution | Small games that teach saving and keys, shipped as content packs. | [0006](docs/rfcs/0006-content-packs-and-community.md) |

## What runs today

The demo vault is v0 ([RFC 0001](docs/rfcs/0001-vault-v0.md)): the educational
prototype that proved the core. It is a P2WSH script with a parent path (any
time) and a child path (after the 18th birthday), and the web app creates,
imports, funds and spends it on signet and testnet. v1
([RFC 0002](docs/rfcs/0002-vault-v1-taproot-guardians.md)) removes the parent
path; its script builder and address derivation are in `src/core/taproot.ts`
as a preview with test vectors, not wired into the UI.

- Educational and unaudited. Do not adapt it for real funds without an
  independent review.
- Non-custodial and local. Keys are created and used in the browser. There is no
  backend and no analytics. The production build sets a Content Security Policy
  whose `connect-src` allows only `https://mempool.space`.
- Recovery phrases and private keys are never written to storage. Only public
  vault descriptors are saved. The service worker caches only the app's own
  build files.
- Keys live in browser memory while a page uses them. A compromised browser,
  extension or device can read anything on the page.

| Vault | Withdraw | Learn |
| --- | --- | --- |
| ![Vault page with deposit address and QR code](docs/screenshots/vault.png) | ![Withdraw screen with the child path locked](docs/screenshots/withdraw.png) | ![Lessons](docs/screenshots/learn.png) |

## Run and test

Requires Node.js 22.12 or newer.

```bash
npm ci
npm run dev        # development server at http://localhost:5173
npm run lint       # ESLint
npm run typecheck  # TypeScript, strict mode
npm test           # Vitest: core, v1 preview, content packs, tutor prompts, status table
npm run build      # type check and production build in dist/
npm run preview    # serve the production build
```

The GitHub Pages build sets `KIDS_WALLET_BASE=/kids-wallet/`
(`.github/workflows/pages.yml`); local builds use `/`. Get test coins from a
signet or testnet faucet and send them to the vault address shown in the app.

### Regtest integration test

`test/regtest.integration.test.ts` funds two v0 vaults on a local regtest node
and checks that the node rejects a child-path spend before the unlock time
(`non-final`) and accepts the parent path at any time and the child path after
the unlock time. It is skipped unless `BITCOIND_RPC_URL` is set, and it refuses
to run on any chain other than regtest.

```bash
bitcoind -regtest -daemon -rpcuser=kids -rpcpassword=wallet -fallbackfee=0.0002
BITCOIND_RPC_URL=http://kids:wallet@127.0.0.1:18443 npm test
bitcoin-cli -regtest -rpcuser=kids -rpcpassword=wallet stop
```

## Project structure

```
src/
  core/            Vault logic with no React or DOM imports (enforced by ESLint)
    script.ts      v0 witness script, script number encoding
    vault.ts       v0 P2WSH address, vault descriptor export and import
    psbt.ts        v0 coin selection, PSBT build, sign and finalize
    taproot.ts     v1 PREVIEW: Taproot leaves, guardian leaf, address, control blocks
    keys.ts        BIP39 recovery phrases, BIP32 derivation, WIF import
    validate.ts    Public keys, unlock time, birth date, fee rate, addresses, amounts
  api/mempool.ts   mempool.space client
  content/         Lessons, status table source, scripted tutor demo
  pages/           Landing, vaults, create, import, vault, withdraw, learn
  components/      Shared UI, recovery phrase backup, SVG illustrations
content/           Content pack schema and packs
tutor/             Tutor persona and demo prompts per age band
docs/              Vision, roadmap, RFCs, screenshots
test/              Optional regtest integration test
```

## Contributing

Tracks: Flutter or native client, pt-BR and other language packs, mini-games
for 6 to 9, Taproot v1, FROST growth ceremonies, passkey unlock, tutor safety
evals, charity integration. Each has an RFC and an issue template. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## History

The project began as the XYZ Challenge, a hackathon run by Pedro Fernandes in
2024 around the Kids Wallet idea. The original plan derived the wallet from the
child's face and date of birth; that was dropped because a face and a birth date
are public or easy to find, so the prototype uses random keys from BIP39
recovery phrases and the design keeps biometrics on the device only. This
repository now holds the working prototype and the public design for what comes
next.

## Support

- Bitcoin: `15RAWooPeRazczEterHYdDDozxZksyQpDh`
- PIX: `adm.nuvem@protonmail.com`
- GitHub Sponsors: [hitice](https://github.com/sponsors/hitice)

## License

MIT. See [LICENSE](LICENSE).

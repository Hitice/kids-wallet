# Contributing to Kids Wallet

Kids Wallet is an open-source project in public design. The working code is
an educational prototype on signet and testnet; most of the product is written
as RFCs waiting for people to build them. Start with
[docs/VISION.md](docs/VISION.md), then the [RFCs](docs/rfcs/).

## Code of conduct

This project follows the
[Contributor Covenant, version 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
The project is about children: be kind, assume good intent, and never post
anything about a real child. Report problems to the maintainer at
`adm.nuvem@protonmail.com`.

## Contribution tracks

Each track has an RFC and an issue template. Open an issue first to say you are
taking it, so two people do not build the same thing.

| Track | What to build | RFC | Template |
| --- | --- | --- | --- |
| Flutter or native client | A client that reads and writes the same vault descriptor, shows balance and deposit address, signs on the device with platform key storage | [0008](docs/rfcs/0008-platforms-pwa.md) | Feature track |
| pt-BR and other language packs | Translate `content/packs/en/basics-6-9.json` and write new packs. Brazilian Portuguese is the first track. | [0006](docs/rfcs/0006-content-packs-and-community.md) | Content pack |
| Mini-games for 6 to 9 | Small games about saving and about secrets, referenced from packs, with no access to keys | [0006](docs/rfcs/0006-content-packs-and-community.md) | Feature track |
| Taproot v1 implementation | Spending code for both leaves, PSBT support, a v0 to v1 migration, regtest and signet tests, built on `src/core/taproot.ts` | [0002](docs/rfcs/0002-vault-v1-taproot-guardians.md) | Feature track |
| FROST growth ceremonies | Threshold child key, share refresh at 12 and 16, hand-over at 18 | [0003](docs/rfcs/0003-threshold-child-key-and-growth-ceremonies.md) | Feature track |
| Passkey unlock | WebAuthn (PRF where available) and platform biometrics to unlock the device share. Never key material. | [0004](docs/rfcs/0004-device-biometrics-and-passkeys.md) | Feature track |
| Tutor safety evals | Scenario suites per age band that check the tutor never asks for secrets, never gives financial advice and always escalates | [0005](docs/rfcs/0005-ai-tutor-by-age-band.md) | Feature track |
| Charity integration | Confirm the charity list with written statements, and build the pre-signed recovery transaction flow | [0007](docs/rfcs/0007-charity-fallback.md) | Feature track |

To discuss a design instead of building it, use the "RFC comment" template.

## Rules that do not change

- No secrets in storage, logs, analytics, issues or test fixtures. Only the
  public BIP39 test mnemonics already in `src/core/test-fixtures.ts` may
  appear in tests.
- `src/core/` has no React, no `window`, no `document` and no `fetch` (ESLint
  enforces it). Network access lives in `src/api/`.
- The production build talks only to `https://mempool.space` (Content Security
  Policy). A new network peer needs an RFC.
- Test networks only. Nothing that reaches mainnet is merged before an
  independent security review.
- Biometrics are never key material.
- The tutor never holds keys and never sees secrets.
- Plain English, plain ASCII, no em dashes and no emojis in code, docs and UI
  copy (a test checks this).

## Run and test

Requires Node.js 22.12 or newer.

```bash
npm ci
npm run dev        # http://localhost:5173
npm run lint       # ESLint
npm run typecheck  # TypeScript, strict
npm test           # Vitest: core, content packs, tutor prompts, status table
npm run build      # type check and production build in dist/
npm run preview    # serve the production build
```

The optional regtest integration test needs a local `bitcoind`; see the
README.

### Things the tests check for you

- The status table in `README.md` matches `src/content/status.ts`. If you
  change the status of an area, edit `status.ts` and paste the new table into
  the README (the failing test prints it).
- Every content pack matches `content/schema.json`.
- The demo prompts on the landing page match `tutor/prompts/`.

## Pull requests

- One topic per pull request. Fill the template.
- CI runs lint, type check, tests and the build. All must pass.
- Changes to rules, scripts or keys update the RFC in the same pull request
  and add a line to its history.

## License

By contributing you agree that your contribution is licensed under the MIT
license of this repository. Lesson text in `content/packs/` is licensed under
CC BY 4.0, so schools and other apps can reuse it with attribution.

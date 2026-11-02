# Kids Wallet

[![CI](https://github.com/Hitice/kids-wallet/actions/workflows/ci.yml/badge.svg)](https://github.com/Hitice/kids-wallet/actions/workflows/ci.yml)

B.I.E.L. - Bitcoin Is Everyone's Legacy.

Kids Wallet is a non-custodial web app that lets parents save bitcoin for a child. The coins sit in a Bitcoin script with two spending paths: the parent can spend at any time, and the child can spend only after their 18th birthday. The app also has six short lessons about money for children and parents.

The project is educational and unaudited. The user interface only works on signet and testnet, where coins have no value. Do not adapt it for real funds without an independent review.

## How the vault works

Each vault is a P2WSH (native SegWit v0) output locked by this witness script:

```
OP_IF
  <parentPubKey> OP_CHECKSIG
OP_ELSE
  <unlockTime> OP_CHECKLOCKTIMEVERIFY OP_DROP
  <childPubKey> OP_CHECKSIG
OP_ENDIF
```

- `parentPubKey` and `childPubKey` are compressed secp256k1 public keys (33 bytes).
- `unlockTime` is the child's 18th birthday at 00:00 UTC as a Unix timestamp. The app requires it to be at least 500000000 so that `OP_CHECKLOCKTIMEVERIFY` compares it with time and not with block height, and at most 0xffffffff so it fits in `nLockTime`. A child born on 29 February turns 18 on 1 March in non-leap years.
- The vault address is `OP_0 <sha256(witnessScript)>` encoded in bech32 (`tb1q...` on signet and testnet).

### Parent path

Spends at any time. The witness stack is `<signature> <0x01> <witnessScript>`: the `0x01` makes `OP_IF` take the first branch. The app builds these transactions with `nLockTime = 0` and `nSequence = 0xfffffffd`.

### Child path

Spends only after `unlockTime`. The witness stack is `<signature> <empty> <witnessScript>`: the empty item makes `OP_IF` take the `OP_ELSE` branch. `OP_CHECKLOCKTIMEVERIFY` only passes when the transaction has `nLockTime >= unlockTime` (both as timestamps) and the input's `nSequence` is not `0xffffffff`, so the app sets `nLockTime = unlockTime` and `nSequence = 0xfffffffe` on every input. The app refuses to build a child-path transaction before the unlock time.

### Median time past

Time-based lock times are not checked against the clock or against the timestamp of the next block. Since BIP113, a transaction is final only when its `nLockTime` is lower than the median time past (MTP): the median timestamp of the previous 11 blocks. MTP usually trails real time by about one hour, so the child path becomes spendable roughly one to two hours after `unlockTime`. The withdraw screen reads the current MTP from mempool.space and uses it to decide whether the child path is open.

### What the script does not do

- The parent key keeps working after the 18th birthday. Once the child path opens, the child should move the coins to a wallet that only they control.
- Change from a partial withdrawal goes back to the same vault address, so it stays under the same rules.
- The script is a custom script, not Miniscript (it uses `OP_DROP` after `OP_CHECKLOCKTIMEVERIFY`), so general descriptor wallets will not recognize it. Use the exported vault file with this app or with the core library.
- Lock times after 19 January 2038 (above 2^31 - 1) are encoded as 5-byte script numbers. Consensus accepts this for `OP_CHECKLOCKTIMEVERIFY`, and the unit tests cover it.

## Why there is no facial recognition or birth-date key

The original plan derived the wallet from the child's face and date of birth. A face and a birth date are public or easy to find, so a key built from them can be guessed by anyone; this app uses random keys from BIP39 recovery phrases instead.

## Keys

- Each vault has two keys, one for the parent and one for the child. The app can create both as 12-word BIP39 recovery phrases (128 bits of entropy from `crypto.getRandomValues`), or the parent can paste existing compressed public keys from another wallet.
- Derivation path: `m/84'/1'/0'/0/0` on signet and testnet (`m/84'/0'/0'/0/0` would be used on mainnet), with no BIP39 passphrase. The BIP84 path is reused so the key can be found again with common tools; the key is used inside the vault script, not as a P2WPKH address.
- New recovery phrases are shown once. The user must confirm they wrote each one down and type back one random word before the vault is saved.
- To spend, the user types the recovery phrase (or a WIF private key) on the withdraw screen. The key signs locally and the field is cleared after signing.

## Vault file

The vault can be exported and imported as a JSON file. It contains only public data:

```json
{
  "type": "kids-wallet-vault",
  "version": 1,
  "network": "signet",
  "parentPubKey": "02...",
  "childPubKey": "03...",
  "unlockTime": 2160172800,
  "unlockDate": "2038-06-15T00:00:00.000Z",
  "witnessScript": "6321...ac68",
  "address": "tb1q...",
  "label": "optional",
  "birthDate": "2020-06-15",
  "parentDerivationPath": "m/84'/1'/0'/0/0",
  "childDerivationPath": "m/84'/1'/0'/0/0"
}
```

On import the app rebuilds the script and address from the keys and `unlockTime` and rejects the file if they do not match. Anyone with the file can see the balance, but nobody can spend without one of the two recovery phrases. Keep the file with the phrases: without it you would need the exact unlock time to rebuild the address.

## Test vector

Built from the public BIP39 test mnemonics (never use them for real coins), at `m/84'/1'/0'/0/0`:

| Field | Value |
| --- | --- |
| Parent mnemonic | `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about` |
| Child mnemonic | `zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong` |
| Parent public key | `02e7ab2537b5d49e970309aae06e9e49f36ce1c9febbd44ec8e0d1cca0b4f9c319` |
| Child public key | `02028e9de3ffe2238b2cbf8a60f1c99c076d6e89749018915f2f5af8c8da791c80` |
| Birth date | 2020-06-15 |
| unlockTime | `2160172800` (2038-06-15T00:00:00Z) |
| Witness script | `632102e7ab2537b5d49e970309aae06e9e49f36ce1c9febbd44ec8e0d1cca0b4f9c319ac6705009fc18000b1752102028e9de3ffe2238b2cbf8a60f1c99c076d6e89749018915f2f5af8c8da791c80ac68` |
| Testnet and signet address | `tb1q95v4u3dqqggstt0q7tzxt73z3j4hpmx2kfwttgl6c9ltryc77kyq9yecpt` |
| Regtest address | `bcrt1q95v4u3dqqggstt0q7tzxt73z3j4hpmx2kfwttgl6c9ltryc77kyqgan753` |

## Security model and limitations

- Educational and unaudited. No security review has been done on the code or on the libraries it uses.
- Signet and testnet only. The core library can build mainnet addresses, but the user interface offers no way to reach mainnet, and imported files for other networks are rejected.
- Non-custodial and local. Keys are created and used in the browser. There is no backend and no analytics. The only network requests go to the public mempool.space API (UTXOs, previous transactions, fee estimates, chain tip and broadcast). The production build sets a Content Security Policy that only allows connections to `https://mempool.space`.
- Keys live in browser memory while a page uses them. JavaScript cannot reliably wipe memory, and a compromised browser, extension or device can read anything on the page.
- Recovery phrases and private keys are never written to `localStorage` or any other storage. Only public vault descriptors are stored, so the parent can reopen a vault.
- Losing a recovery phrase means losing that path. If the parent phrase is lost, the coins can only move through the child path after the 18th birthday. If both phrases are lost, the coins are lost.
- The app trusts mempool.space for balances and fee estimates. Previous transactions are checked against their txid before signing, and the txid returned by the broadcast is compared with the local one, but a malicious or unavailable API can still hide coins or block a broadcast. The raw transaction is shown so it can be broadcast through another node.
- Only confirmed coins are spent. The fee is computed from an upper bound of the transaction size, so the final fee rate is never below the one requested.

## Screenshots

Captured from the production build at phone width with Playwright.

| Vaults | Vault | Withdraw | Learn |
| --- | --- | --- | --- |
| ![Vault list](docs/screenshots/home.png) | ![Vault page with deposit address and QR code](docs/screenshots/vault.png) | ![Withdraw screen with the child path locked](docs/screenshots/withdraw.png) | ![Lessons](docs/screenshots/learn.png) |

## Run and test

Requires Node.js 22.12 or newer.

```bash
npm ci
npm run dev        # development server at http://localhost:5173
npm run build      # type check and production build in dist/
npm run preview    # serve the production build
npm test           # unit tests (Vitest)
npm run lint       # ESLint
npm run typecheck  # TypeScript, strict mode
```

Get test coins from a signet or testnet faucet and send them to the vault address shown in the app.

### Regtest integration test

`test/regtest.integration.test.ts` funds two vaults on a local regtest node, mines blocks, and checks that the node rejects a child-path spend before the unlock time (`non-final`) and accepts the parent path at any time and the child path after the unlock time. It is skipped unless `BITCOIND_RPC_URL` is set, and it refuses to run on any chain other than regtest. The node needs no wallet.

```bash
bitcoind -regtest -daemon -rpcuser=kids -rpcpassword=wallet -fallbackfee=0.0002
BITCOIND_RPC_URL=http://kids:wallet@127.0.0.1:18443 npm test
bitcoin-cli -regtest -rpcuser=kids -rpcpassword=wallet stop
```

## Project structure

```
src/
  core/            Vault logic with no React or DOM imports (enforced by ESLint)
    script.ts      Build and decode the witness script, script number encoding
    vault.ts       P2WSH address, vault descriptor export and import
    psbt.ts        Coin selection, PSBT build, sign and finalize for both paths
    keys.ts        BIP39 recovery phrases, BIP32 derivation, WIF import
    validate.ts    Public keys, unlock time, birth date, fee rate, addresses, amounts
    networks.ts    Network parameters and derivation paths
    *.test.ts      Unit tests
  api/mempool.ts   mempool.space client (UTXOs, transaction hex, fees, tip, broadcast)
  lib/             Hash router, saved vaults, data loading hooks, formatting
  components/      Shared UI and the recovery phrase backup step
  pages/           Vaults, create, import, vault, withdraw and learn screens
  content/         Lesson texts
test/              Optional regtest integration test
docs/screenshots/  README screenshots
```

Main libraries: bitcoinjs-lib 7, bip32 5, bip39 3, ecpair 3, @bitcoinerlab/secp256k1 2, qrcode.react 4, React 19, Vite 8, Tailwind CSS 4, Vitest 5. bip39 calls the Node.js `Buffer` global, so `src/polyfills.ts` provides it from the `buffer` package; the other Bitcoin libraries use `Uint8Array`. The production build bundles only the English BIP39 wordlist.

## Roadmap

- Taproot version: a vault with one script leaf per spending path.
- Hardware wallet signing: export the unsigned PSBT and import the signed one.
- Multisig parents: replace the parent key with a 2-of-2 or 1-of-2 between both parents.
- Translations of the interface and lessons, starting with Portuguese.

## History

The project began as the XYZ Challenge, a hackathon run by Pedro Fernandes in 2024 around the Kids Wallet idea. This repository now holds a working base that new challenges can build on.

## Contributing

Open an issue to discuss a change, then send a pull request. CI runs lint, type check, unit tests and the production build. Challenge tracks built on this base:

1. Flutter mobile client: read the same vault file format, show balance and deposit address, and sign withdrawals on the device.
2. Lessons gamification: quizzes, progress per child and small savings goals tied to the vault balance.
3. Taproot migration: design a Taproot vault with the same rules, write the tests, and add a migration flow from the P2WSH vault.
4. PSBT export to hardware wallets: export unsigned PSBTs, import signed ones, and finalize them with the right witness stack for each path.

## Support

- Bitcoin: `15RAWooPeRazczEterHYdDDozxZksyQpDh`
- PIX: `adm.nuvem@protonmail.com`
- GitHub Sponsors: [hitice](https://github.com/sponsors/hitice)

## License

MIT. See [LICENSE](LICENSE).

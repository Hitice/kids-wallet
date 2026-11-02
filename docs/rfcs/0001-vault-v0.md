# RFC 0001: Vault v0, P2WSH with a parent path and a child path after 18

Status: Ready

Code: `src/core/script.ts`, `src/core/vault.ts`, `src/core/psbt.ts`, `src/core/keys.ts`

## Summary

Vault v0 is the educational prototype that proved the core of Kids Wallet. It
is a native SegWit v0 (P2WSH) output with two spending paths: a parent key that
can spend at any time, and a child key that can spend only after the child's
18th birthday. It runs today on signet and testnet. It will be superseded by
vault v1 ([RFC 0002](0002-vault-v1-taproot-guardians.md)), which removes the
parent path.

## Motivation

Before designing guardians, threshold keys and ceremonies, the project needed
to show that the central promise, "the network refuses the child's key before
the 18th birthday", works end to end with real nodes, real fee estimation and a
real browser wallet. v0 is the smallest script that does that.

## Design

Witness script:

```
OP_IF
  <parentPubKey> OP_CHECKSIG
OP_ELSE
  <unlockTime> OP_CHECKLOCKTIMEVERIFY OP_DROP
  <childPubKey> OP_CHECKSIG
OP_ENDIF
```

- `unlockTime` is the 18th birthday at 00:00 UTC as a Unix timestamp, between
  500000000 and 0xffffffff, so CLTV compares time and not height.
- Address: `OP_0 <sha256(witnessScript)>` in bech32.
- Parent path witness: `<sig> <0x01> <witnessScript>`, `nLockTime = 0`,
  `nSequence = 0xfffffffd`.
- Child path witness: `<sig> <empty> <witnessScript>`,
  `nLockTime = unlockTime`, `nSequence = 0xfffffffe`. Consensus checks
  `nLockTime` against the median time past, so the path opens one to two hours
  after `unlockTime`.
- Keys: 12-word BIP39 phrases at `m/84'/1'/0'/0/0` on test networks, or
  compressed public keys pasted from another wallet.
- Vault file: a JSON descriptor with public data only. On import the app
  rebuilds the script and address and rejects any mismatch.

### Vault file

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

Anyone with the file can see the balance; nobody can spend without a recovery
phrase. New phrases are shown once, and the user must type back a random word
before the vault is saved. To spend, the phrase (or a WIF key) is typed on the
withdraw screen, signs locally, and the field is cleared.

### Test vector

Public BIP39 test mnemonics (never use them for real coins), at `m/84'/1'/0'/0/0`:

| Field | Value |
| --- | --- |
| Parent mnemonic | `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about` |
| Child mnemonic | `zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong` |
| Parent public key | `02e7ab2537b5d49e970309aae06e9e49f36ce1c9febbd44ec8e0d1cca0b4f9c319` |
| Child public key | `02028e9de3ffe2238b2cbf8a60f1c99c076d6e89749018915f2f5af8c8da791c80` |
| unlockTime | `2160172800` (2038-06-15T00:00:00Z, birth date 2020-06-15) |
| Witness script | `632102e7ab2537b5d49e970309aae06e9e49f36ce1c9febbd44ec8e0d1cca0b4f9c319ac6705009fc18000b1752102028e9de3ffe2238b2cbf8a60f1c99c076d6e89749018915f2f5af8c8da791c80ac68` |
| Signet and testnet address | `tb1q95v4u3dqqggstt0q7tzxt73z3j4hpmx2kfwttgl6c9ltryc77kyq9yecpt` |
| Regtest address | `bcrt1q95v4u3dqqggstt0q7tzxt73z3j4hpmx2kfwttgl6c9ltryc77kyqgan753` |

### Details kept from the prototype

- Lock times after 19 January 2038 (above 2^31 - 1) are 5-byte script numbers;
  consensus accepts them for CLTV and the tests cover it.
- A child born on 29 February turns 18 on 1 March in non-leap years.
- Change from a partial withdrawal returns to the same vault address.
- The parent key keeps working after 18, so the child should move the coins to
  a wallet only they control once the child path opens.
- Previous transactions are checked against their txid before signing and the
  broadcast txid is compared with the local one. Only confirmed coins are
  spent, and the fee uses an upper bound of the size.
- `test/regtest.integration.test.ts` checks against a real node that the child
  path is `non-final` before the unlock time and accepted after it.

## Enforced by code vs by governance

| Rule | Enforced by |
| --- | --- |
| Child key cannot spend before `unlockTime` | Bitcoin script (CLTV, consensus) |
| Parent key can spend at any time | Bitcoin script |
| Only signet and testnet in the UI | Client only. The core can build mainnet addresses. |
| Recovery phrases are never stored | Client only |
| Network peer is only mempool.space | Client, plus the production Content Security Policy |

Nothing in v0 depends on governance.

## Why it is superseded

- The parent key can empty the vault at any time. That contradicts the
  premise that parents have no spend path.
- One key per side, no recovery: a lost child phrase loses the child path, a
  lost parent phrase too.
- The script is custom (not Miniscript), so descriptor wallets do not
  recognize it.

## Open questions

None. v0 stays as it is for education and as a regression reference.

## History

- 2026-11-02: implemented, 63 unit tests, optional regtest integration test.
- 2026-11-02: marked as the prototype to be superseded by RFC 0002.

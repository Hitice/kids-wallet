# RFC 0002: Vault v1, Taproot with a guardian recovery leaf

Status: In development

Code (preview, not wired into the UI): `src/core/taproot.ts`, `src/core/taproot.test.ts`

## Summary

Vault v1 replaces v0 with a Taproot (SegWit v1) output that has no parent path.
The child can spend after the 18th birthday. If the child's key is lost, 2 of 3
independent guardians can spend after a long delay, and by policy only to a
pre-committed list of children's charities. Anyone can deposit. Parents, the
company and the AI tutor have no key in the script.

## Motivation

The premise of Kids Wallet is that the savings belong to the child. In v0 the
parent key can empty the vault at any time ([RFC 0001](0001-vault-v0.md)), so
the promise depends on the parents' goodwill. v1 makes the promise a property
of the script. It also adds the recovery path v0 lacks: in v0 a lost child
phrase loses the child path for good.

## Design

### Spending conditions

1. **Child**: the child key, valid only when the transaction's `nLockTime` is
   at or after the 18th birthday (`OP_CHECKLOCKTIMEVERIFY`, same rule as v0).
2. **Guardian recovery**: 2 of 3 guardian keys, valid only after the output has
   been confirmed for `recoveryDelayBlocks` blocks (`OP_CHECKSEQUENCEVERIFY`).
   The three guardians are independent of each other and of the family:
   - a Kids Wallet foundation key,
   - a guardian chosen by the family who is not a parent,
   - a notary or trustee.

There is no third condition. In particular there is no parent path, no
company path and no path for the tutor.

### Key path and script path

The intended design is:

- **Key path**: the child's key, as a FROST threshold key
  ([RFC 0003](0003-threshold-child-key-and-growth-ceremonies.md)), usable only
  after the 18th birthday.
- **Script path**: the guardian recovery leaf.

A Taproot key path cannot carry a timelock by itself: a valid signature for the
output key spends at any time. Two ways to keep the 18th-birthday rule on the
key path are on the table (open question 1):

- (a) The FROST signing group refuses to sign before 18 and the shares are
  arranged so no subset that exists before 18 can reach the threshold. This
  moves the timelock from consensus to key custody.
- (b) The key path is unspendable (a NUMS internal key) and the child path is a
  script leaf with CLTV. The timelock stays in consensus.

The preview in `src/core/taproot.ts` implements (b), because it keeps every
rule in the "enforced by script" column today. Moving to (a) later changes the
internal key and the address, not the guardian leaf.

### Scripts in the preview

```
internal key   50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0
               (BIP341 NUMS point: lift_x(sha256(G)), nobody knows its private key)

child leaf     <unlockTime> OP_CHECKLOCKTIMEVERIFY OP_DROP <childXOnly> OP_CHECKSIG

guardian leaf  <recoveryDelayBlocks> OP_CHECKSEQUENCEVERIFY OP_DROP
               <g1> OP_CHECKSIG <g2> OP_CHECKSIGADD <g3> OP_CHECKSIGADD
               OP_2 OP_NUMEQUAL
```

- Guardian keys are x-only (BIP340) and sorted, so the same three guardians
  always give the same address whatever order they are entered in.
- Default delay: 26280 blocks (about six months). CSV in block units allows at
  most 65535 blocks (about 15 months). Open question 2.
- Leaf version 0xc0 (tapscript, BIP342). The tree has two leaves at depth 1.
- Keys for the preview tests use BIP86 paths (`m/86'/1'/0'/0/0` on test
  networks).

### Test vector (v1 preview)

Public BIP39 test mnemonics at `m/86'/1'/0'/0/0`. Never use them for real coins.

| Role | Mnemonic | Compressed public key |
| --- | --- | --- |
| Child | `zoo zoo ... zoo wrong` | `03c9b6a3c4210cd78bf0734755c44c0fa9d51277a45c1e4929face4694387c1589` |
| Foundation guardian | `abandon abandon ... abandon about` | `0255355ca83c973f1d97ce0e3843c85d78905af16b4dc531bc488e57212d230116` |
| Family guardian | `legal winner thank year wave sausage worth useful legal winner thank yellow` | `029ff08732287dca062343cf43f763ea84dcd40348a1dd6f90956beb0c59c33b94` |
| Notary | `letter advice cage absurd amount doctor acoustic avoid letter advice cage above` | `02ed448f7bf9160cd2f3b0b88e29486df8d09c2cc4705ebf0655d33f3373e4f322` |

`unlockTime = 2160172800` (2038-06-15T00:00:00Z), `recoveryDelayBlocks = 26280`.

| Field | Value |
| --- | --- |
| Child leaf | `05009fc18000b17520c9b6a3c4210cd78bf0734755c44c0fa9d51277a45c1e4929face4694387c1589ac` |
| Guardian leaf | `02a866b2752055355ca83c973f1d97ce0e3843c85d78905af16b4dc531bc488e57212d230116ac209ff08732287dca062343cf43f763ea84dcd40348a1dd6f90956beb0c59c33b94ba20ed448f7bf9160cd2f3b0b88e29486df8d09c2cc4705ebf0655d33f3373e4f322ba529c` |
| Child leaf hash | `71be3cd980b7942bec9323d045fe492fc538b7b466aabfb5962b5fec62656ce2` |
| Guardian leaf hash | `79bc4de6b6aa79f224ae31a512802c01c06b35047201272544320b04e88f2a14` |
| Output key | `906cb618acdcec0045202cd29e621c9ba0ada35c7a8a4683deb6c4807d49bab4` |
| Guardian control block | `c150929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac071be3cd980b7942bec9323d045fe492fc538b7b466aabfb5962b5fec62656ce2` |
| Signet and testnet address | `tb1pjpktvx9vmnkqq3fq9nffucsunws2mg6u029ydq77kmzgql2fh26q3sp3jz` |

The tests recompute the output key independently (TapLeaf, TapBranch and
TapTweak tagged hashes plus the x-only tweak) and check the BIP86 published
vector for the key derivation.

### Spending the guardian leaf

Witness: `<sig_g3 or empty> <sig_g2 or empty> <sig_g1 or empty> <guardianLeaf>
<controlBlock>`, with the input's `nSequence` at least `recoveryDelayBlocks`
and transaction version 2. Not implemented yet.

### Where the coins go after recovery

The script cannot say "only to these charities": restricting the destination
of an output purely on-chain needs covenants (for example `OP_CHECKTEMPLATEVERIFY`
or `OP_CAT` based constructions), which Bitcoin does not have today. The
practical mechanism is described in [RFC 0007](0007-charity-fallback.md):
transactions to the charities are pre-signed for each deposit by the foundation
key and published, and the guardians follow published governance.

## Enforced by code vs by governance

| Rule | Enforced by |
| --- | --- |
| No parent, company or tutor path | Bitcoin script (no such key in any leaf; NUMS internal key) |
| Child spends only after the 18th birthday | Bitcoin script (CLTV) in the preview design (b) |
| Recovery needs 2 of 3 guardians | Bitcoin script (`OP_CHECKSIGADD`, `OP_NUMEQUAL`) |
| Recovery waits `recoveryDelayBlocks` after each deposit confirms | Bitcoin script (CSV) |
| Recovery pays only children's charities | Governance plus pre-signed transactions (RFC 0007). Not enforceable on-chain without covenants. |
| Guardians are independent of the family and of each other | Governance |
| Child path not usable before 18 if design (a) is chosen | Key custody (FROST), not consensus |

## Risks

- **Two guardians collude.** They could send the coins anywhere after the
  delay. Mitigations: independent guardians, public identities, the long delay
  during which the child (if they still have a key) can move the coins first
  after 18, monitoring of the vault address, and legal agreements. This is a
  governance risk and it is stated as such.
- **The delay restarts per deposit.** CSV counts from each output's own
  confirmation, so a deposit made at 17 has its own delay.
- **Key path design (a)** would make the 18th-birthday rule a custody rule.
  That must be decided before mainnet.

## Open questions

1. Key path design: (a) FROST custody timelock or (b) NUMS key path with a CLTV
   child leaf?
2. Delay length: about six months by default, at most about 15 months with CSV
   in blocks. Should it be longer by using an absolute timelock instead?
3. Should the guardian leaf also require a later absolute time (for example
   age 25) so that recovery cannot happen while the child is a minor and may
   simply not be able to act yet?
4. Migration from v0: a v0 parent can sweep into v1. Who signs, and how is it
   shown to the family?
5. Descriptor format: can the leaves be expressed in Miniscript
   (`and_v(v:after(t),pk(C))`, `and_v(v:older(d),multi_a(2,G1,G2,G3))`) so
   standard descriptor wallets recognize the vault?

## History

- 2026-11-02: preview of the script builder, address derivation and control
  blocks with tests; no spending code, no UI.

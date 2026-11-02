# RFC 0003: Threshold child key and growth ceremonies

Status: Open

## Summary

The child's key in vault v1 is not a single key on a single device. It is a
FROST threshold key (Schnorr, BIP340 compatible) whose shares are held by the
child's device, the family and a backup holder. At growth ceremonies, for
example at 12 and 16, the shares are refreshed and shift toward the child. At
18 the hand-over ceremony leaves the child able to sign alone. A broken tablet
at age 7 does not lose the funds.

## Motivation

A 7-year-old cannot be expected to keep a 12-word phrase safe for 11 years. A
single key on a tablet is lost when the tablet is. Giving the parents a copy
of the child's key would recreate the parent path that v1 removes. A threshold
key solves both: no single holder can sign, and losing one share loses
nothing.

## Design

### The group

FROST produces one aggregate x-only public key. To the Bitcoin network it is
an ordinary BIP340 key: the child leaf of [RFC 0002](0002-vault-v1-taproot-guardians.md)
(or the key path, depending on its open question 1) uses it like any other key.

Example share layout (to be decided, see open questions):

| Phase | Shares | Threshold | Who can sign |
| --- | --- | --- | --- |
| Birth to 12 | child device, parent A device, parent B or family backup, sealed paper backup | 3 of 4 | Nobody alone; but the vault script refuses the child path before 18 anyway |
| 12 to 16 | child device (2 shares), family backup, sealed paper backup | 3 of 4 | Child plus one other |
| 16 to 18 | child device (2 shares), child paper backup, family backup | 3 of 4 | Child alone with their own backup |
| 18 hand-over | child device, child paper backup | 2 of 2, or a fresh single key | Child alone |

Before 18 the script refuses every child-path transaction, so the threshold
before 18 protects against loss and against theft of a future key, not against
spending now.

### Ceremonies

A growth ceremony is a FROST share refresh (proactive secret sharing): the
holders run a protocol that produces new shares of the same secret, and the old
shares become useless. The aggregate public key, and so the vault address, does
not change. The tutor ([RFC 0005](0005-ai-tutor-by-age-band.md)) runs the
ceremony screens; it never sees a share.

At 18 the hand-over ceremony either refreshes into a layout only the young
adult controls, or, recommended, the young adult moves the coins to a fresh
wallet whose phrase only they hold (see `tutor/prompts/18-ceremony.md`).

### Libraries

Candidate implementations to evaluate: the Zcash Foundation `frost-secp256k1-tr`
crate (Rust, Taproot tweak support), and a WebAssembly build of it for the web
client. No library is chosen yet.

## Enforced by code vs by governance

| Rule | Enforced by |
| --- | --- |
| No child-path spend before 18 | Bitcoin script (RFC 0002 design b) |
| No single share can sign | FROST cryptography |
| Old shares are useless after a ceremony | FROST refresh, if every holder deletes the old share. Deletion cannot be proven. |
| Ceremonies happen at 12 and 16 | App behaviour and family agreement only |
| Parents cannot reach the threshold alone | Share layout, chosen at setup |

## Risks

- Share refresh relies on holders deleting old shares; a holder who keeps old
  shares and colludes with enough other old holders can still sign.
- FROST implementations are young. Nonce handling bugs leak keys.
- If design (a) of RFC 0002 is chosen, the threshold becomes the only thing
  that enforces the 18th birthday, and the layout before 18 must make sure no
  set of adults reaches it.

## Open questions

1. Share layout and thresholds per phase.
2. Ceremony ages: 12 and 16 as examples. Should the family be able to choose?
3. What is the paper backup format for one share, and who keeps it?
4. Rust core with WebAssembly in the web app, or a separate audited library
   per platform?
5. How does a ceremony recover when one holder is missing or has lost their
   share?

## History

- 2026-11-02: first draft.

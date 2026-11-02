# RFC 0007: Charity fallback

Status: Open

## Summary

If every share of the child's key is lost, the guardian recovery leaf of vault
v1 ([RFC 0002](0002-vault-v1-taproot-guardians.md)) lets 2 of 3 guardians move
the coins after a long delay. By policy they may only send them to a
pre-committed list of five children's charities. This RFC defines how that
policy is made as hard to break as Bitcoin allows today, and states plainly
what remains a matter of trust.

## Motivation

Coins that nobody can ever move help no one. Coins that guardians could send
to themselves would turn the recovery path into a theft path. Sending them to
children's charities keeps the purpose of the savings, removes any incentive
for the guardians, and gives the family a clear, public promise.

## Design

### What the script can and cannot do

The guardian leaf checks signatures and a delay. It cannot check where the
coins go. Restricting the destination of a Bitcoin output purely on-chain
needs covenants (for example `OP_CHECKTEMPLATEVERIFY`, `OP_CAT` based
constructions or `OP_VAULT` proposals), and none is active on Bitcoin today.

### Pre-signed transactions

For every deposit into a vault:

1. The client builds a recovery transaction that spends that output through
   the guardian leaf and pays the five charities in equal parts (minus fee),
   with `nSequence = recoveryDelayBlocks`.
2. The foundation key signs it (one of the two signatures needed), using
   `SIGHASH_ALL`, so the signature is only valid for exactly those outputs.
3. The signed transaction is published (in the family's vault file and in a
   public log run by the foundation).
4. To execute recovery, a second guardian adds their signature and broadcasts
   it after the delay.

The foundation commits in its governance never to sign any other spend of the
guardian leaf. With the foundation's signature limited to the charity
transaction, a recovery to any other destination needs the family guardian and
the notary to collude, without the foundation.

### Fees

A pre-signed transaction fixes its fee when it is signed. Options: one output
anchor for CPFP (an anchor output spendable by anyone), or several versions at
different fee rates. Open question 2.

### The charity list

To be confirmed with the community. Criteria: global reach, a focus on
children, a published way to receive bitcoin directly to an address they
control, and audited accounts.

| # | Organization | Status |
| --- | --- | --- |
| 1 | UNICEF (Cryptocurrency Fund) | Candidate. UNICEF announced on 9 October 2019 a fund that can "receive, hold and disburse donations of cryptocurrencies ether and bitcoin" (UNICEF press release). Whether it accepts this kind of transfer today, and to which address, is to be confirmed. |
| 2 | To be confirmed | To be chosen with the community |
| 3 | To be confirmed | To be chosen with the community |
| 4 | To be confirmed | To be chosen with the community |
| 5 | To be confirmed | To be chosen with the community |

No organization on this list has agreed to anything. No address is published
until an organization confirms it in writing.

## Enforced by code vs by governance

| Rule | Enforced by |
| --- | --- |
| Recovery needs 2 of 3 guardians and a delay | Bitcoin script |
| The foundation's signature only exists for the charity transaction | Cryptography (`SIGHASH_ALL`) plus the foundation's published commitment not to sign anything else |
| Recovery pays only the charities | Governance. Two non-foundation guardians colluding could pay anyone. |
| Charity addresses are genuine | Governance: written confirmation from each organization, published |
| A new deposit gets its own pre-signed transaction | Client behaviour |

## Open questions

1. The other four charities.
2. Fee strategy for pre-signed transactions (anchor output or fee ladder).
3. What happens if a charity closes or changes its address: re-sign for new
   deposits only, or ask the family to roll the vault?
4. Should the foundation publish a transparency log of every pre-signed
   transaction and every signing request it receives?
5. Legal form of the foundation, and in which jurisdiction.

## History

- 2026-11-02: first draft. Charity list to be confirmed.

# Kids Wallet: vision

Bitcoin Is Everyone's Legacy.

## The idea

Parents, grandparents and friends save bitcoin for a child. The coins sit in a
vault that nobody can empty before the child turns 18: not the parents, not the
company that makes the app, not the AI tutor. On the 18th birthday the child
receives full control in a hand-over ceremony.

Between birth and 18, the app grows with the child:

| Age | What the child sees |
| --- | --- |
| 6 to 9 | Cartoons, short stories and mini-games about saving and about secrets you never share. A treasure chest that fills up. |
| 10 to 13 | Weekly challenges, quizzes and honest answers to "why". A first growth ceremony at 12. |
| 14 to 17 | Real-world money: budgets, a first job, scams, what a bank does, what self-custody means. A second growth ceremony at 16. |
| 18 | The hand-over ceremony. The script opens the child path and the young adult takes full control. |

An AI tutor accompanies the child through those years and changes its tone and
topics as the child grows. Lessons and games are maintained by the community as
versioned content packs, so any language and any culture can add its own. The
app runs on tablet, phone and web (PWA).

## Security is the premise

- **Funds are governed by Bitcoin script.** Parents have no spend path at all.
  Anyone can deposit; a deposit needs no key.
- **The child path opens at 18.** The child's key can spend only after the 18th
  birthday, enforced by `OP_CHECKLOCKTIMEVERIFY`.
- **Lost keys are expected.** The child's key is a FROST threshold key whose
  shares shift toward the child at growth ceremonies, so a broken tablet does
  not lose the funds. If every share is lost, 2 of 3 independent guardians can
  move the coins after a long delay, and by policy only to a pre-committed list
  of children's charities.
- **Biometrics unlock the device, never the vault.** Face, iris and fingerprint
  go through platform biometrics (WebAuthn passkeys, Face ID, Android
  biometric). They are not key material and never leave the device.
- **The tutor never holds keys and never sees secrets.** It teaches, guides and
  runs the ceremony screens. The script releases the funds.

## What exists today

A working educational prototype (vault v0) on signet and testnet: a P2WSH
script with a parent path and a child path after 18, a web app that creates,
imports, funds and spends it, and six lessons. It proved the core and will be
superseded by vault v1. The status of every part is in the
[README](../README.md#status) and in the [RFCs](rfcs/).

## What this project is not

- Not a custodian. There is no account, no server holding keys, no support
  ticket that moves coins.
- Not an investment product. The app and the tutor teach saving concepts and
  never give price predictions or buy and sell advice.
- Not ready for real funds. Nothing here has been audited.

## How it gets built

In public. Each design decision is an RFC in [docs/rfcs](rfcs/), with what is
enforced by code and what by governance stated separately. Each piece of work
is a contribution track in [CONTRIBUTING.md](../CONTRIBUTING.md). The phases are
in [ROADMAP.md](ROADMAP.md).

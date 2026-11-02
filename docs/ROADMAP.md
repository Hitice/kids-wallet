# Roadmap

Three phases. Nothing here has a date: each phase ends when its exit criteria
are met and reviewed in public. The live status of each area is the table in
the [README](../README.md#status), generated from `src/content/status.ts`.

## Phase 1: prove the core (done)

The educational prototype.

- Vault v0: P2WSH with a parent path and a child path after 18
  ([RFC 0001](rfcs/0001-vault-v0.md)).
- Web app: create, import, deposit, withdraw on signet and testnet.
- 63 unit tests on the core, an optional regtest integration test, CI.
- Six lessons for children and parents.

Exit criteria, met: the child path is refused before the unlock time and
accepted after it by a real node (regtest), and the parent path works at any
time.

## Phase 2: public design (current)

Turn the prototype into a design the community can review and build.

- Concept showcase: landing page, vision, RFCs 0001 to 0008, contribution
  tracks, issue templates.
- Vault v1 preview: Taproot script tree with the child leaf and the 2-of-3
  guardian recovery leaf, address derivation and test vectors
  ([RFC 0002](rfcs/0002-vault-v1-taproot-guardians.md)). Not wired into the UI.
- Tutor persona, age-band prompts and a scripted demo
  ([RFC 0005](rfcs/0005-ai-tutor-by-age-band.md)).
- Content pack format, schema and the first English pack
  ([RFC 0006](rfcs/0006-content-packs-and-community.md)).
- PWA: installable on tablet and phone, offline shell
  ([RFC 0008](rfcs/0008-platforms-pwa.md)).

Exit criteria: every RFC has had a public comment period, the open questions in
RFCs 0002, 0003 and 0007 have answers, and the charity list is confirmed.

## Phase 3: build v1 on signet

Implement the reviewed design, still on test networks only.

- Vault v1 spending code for both leaves, a migration from v0, and regtest and
  signet tests ([RFC 0002](rfcs/0002-vault-v1-taproot-guardians.md)).
- FROST child key with growth ceremonies at 12 and 16 and the hand-over at 18
  ([RFC 0003](rfcs/0003-threshold-child-key-and-growth-ceremonies.md)).
- Passkey unlock on the device ([RFC 0004](rfcs/0004-device-biometrics-and-passkeys.md)).
- Tutor with a model behind it, gated by safety evals
  ([RFC 0005](rfcs/0005-ai-tutor-by-age-band.md)).
- Pre-signed charity transactions and published guardian governance
  ([RFC 0007](rfcs/0007-charity-fallback.md)).
- pt-BR content pack and mini-games for ages 6 to 9.
- A native or Flutter client reading the same vault descriptor.

Exit criteria: an independent security review of the script, the key
ceremonies and the client. Mainnet is out of scope until that review is done
and published.

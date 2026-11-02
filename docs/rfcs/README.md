# RFCs

Each structural decision of Kids Wallet is written as an RFC before it is
built. Every RFC states what is enforced by code (the Bitcoin script or the
client) and what is enforced by governance (people, published rules,
pre-signed transactions), because the two give different guarantees.

| RFC | Title | Status |
| --- | --- | --- |
| [0001](0001-vault-v0.md) | Vault v0: P2WSH with a parent path and a child path after 18 | Ready |
| [0002](0002-vault-v1-taproot-guardians.md) | Vault v1: Taproot with a guardian recovery leaf | In development |
| [0003](0003-threshold-child-key-and-growth-ceremonies.md) | Threshold child key and growth ceremonies | Open |
| [0004](0004-device-biometrics-and-passkeys.md) | Device biometrics and passkeys | Open |
| [0005](0005-ai-tutor-by-age-band.md) | AI tutor by age band | Open |
| [0006](0006-content-packs-and-community.md) | Content packs and community | Open |
| [0007](0007-charity-fallback.md) | Charity fallback | Open |
| [0008](0008-platforms-pwa.md) | Platforms and PWA | In development |

## Statuses

- **Ready** - implemented, tested and running on signet and testnet.
- **In development** - design accepted, code or documents exist but are not
  complete.
- **Open** - design written and open for comment and contribution. Nothing is
  built yet beyond what the RFC lists.

## Commenting

Open an issue with the "RFC comment" template and name the RFC and section.
Changes to an RFC go through a pull request that edits the file and adds a line
to its history.

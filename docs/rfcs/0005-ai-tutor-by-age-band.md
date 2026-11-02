# RFC 0005: AI tutor by age band

Status: Open

Files: `tutor/persona.md`, `tutor/prompts/*.md`, `src/content/tutor.ts` (scripted demo)

## Summary

An AI tutor accompanies the child from 6 to 18. It teaches money and Bitcoin
concepts, explains what the app shows, and runs the screens of the growth and
hand-over ceremonies. It changes tone and topics with the child's age band. It
never holds keys and never sees secrets: the Bitcoin script releases the
funds, not the tutor.

## Motivation

Content packs ([RFC 0006](0006-content-packs-and-community.md)) give the
structure; a tutor gives the conversation. Children learn by asking "why", and
a patient guide that remembers what the child already learned can answer at
the right level. The same guide being present at 18 makes the hand-over a
familiar step rather than a cliff.

## Design

### Age bands

| Band | Tone | Example topics |
| --- | --- | --- |
| 6 to 9 | Very short sentences, pictures in words, small numbers | What money is, saving, secrets you never share, the treasure chest |
| 10 to 13 | Short paragraphs, cause and effect, arithmetic, challenges | Interest over time, what Bitcoin is, keys, guardians |
| 14 to 17 | Direct, trade-offs, real-world cases | Budgets, scams, self-custody, fees, what happens at 18 |
| 18 ceremony | Adult, exact, one step at a time | The hand-over steps, backups, the first move |

The rules for every band are in `tutor/persona.md`. One demo prompt per band is
in `tutor/prompts/`. The landing page imports those files at build time for
its copyable prompt, and a test checks they match.

### Hard rules

- Never asks for, shows, stores or repeats a secret (phrase, key, share, PIN,
  password, biometric data).
- No access to keys or signing. The tutor process has no share and no signing
  API; it receives only public data the screen already shows.
- No financial advice beyond saving concepts.
- No personal data collection.
- Escalates to a trusted adult when the child mentions harm, fear, bullying or
  pressure for money or secrets.

### Architecture (proposal)

- The tutor runs in a sandbox that cannot call signing code. Ceremony screens
  are app code; the tutor only produces the explanatory text around them.
- Input filter: anything that looks like a BIP39 phrase, a WIF key or an
  extended key is removed before the text reaches the model, and the child is
  told to stop.
- Output filter: the same patterns, plus price predictions and buy or sell
  advice, are blocked before display.
- Model choice is open: an on-device model (privacy, offline) or a hosted model
  (quality), or both by age band. No conversation leaves the device without
  parental consent.

### Today

A scripted demo on the landing page: no model, no network call, canned
answers per age band.

## Enforced by code vs by governance

| Rule | Enforced by |
| --- | --- |
| Tutor cannot move funds | Architecture: no key, no share, no signing API in the tutor's reach; the script needs a signature it cannot produce |
| Tutor never sees secrets | Input filter in client code; secrets are never put into the tutor's context |
| Age-appropriate tone and no financial advice | Prompting, output filters and safety evals. Models can fail, so this is tested, not guaranteed. |
| Escalation to a trusted adult | Prompting plus a fixed app card that the filter can trigger |

## Open questions

1. On-device or hosted model per band? What is the minimum quality bar?
2. Safety eval suite: which scenarios, which pass rate blocks a release?
3. What does the tutor remember across years, where is it stored, and who can
   read it?
4. Parental consent flow for any hosted model, under LGPD and GDPR rules on
   children's data.

## History

- 2026-11-02: first draft, persona, four demo prompts and a scripted demo.

# RFC 0006: Content packs and community

Status: Open

Files: `content/README.md`, `content/schema.json`, `content/packs/en/basics-6-9.json`, `src/content/pack.test.ts`

## Summary

Lessons, quizzes and mini-game references are shipped as versioned JSON
content packs, one language and one age band per pack, validated against a
JSON Schema. The community writes and reviews them through pull requests.
Brazilian Portuguese (`pt-BR`) is the first community track.

## Motivation

Twelve years of material across four age bands, in many languages and
cultures, cannot be written by one team. Money is also local: allowance
customs, coins and examples differ by country. A plain, versioned file format
lets teachers and parents contribute without touching the app code, and lets
reviewers check every text for the safety rules.

## Design

- Format and rules: [content/README.md](../../content/README.md).
- Schema: [content/schema.json](../../content/schema.json) (JSON Schema draft
  2020-12, `additionalProperties: false` everywhere).
- Example: `content/packs/en/basics-6-9.json`, four of the six existing lessons
  reorganized for ages 6 to 9, with quizzes and game references added.
- Validation: `npm test` checks every pack against the schema with Ajv in
  strict mode, checks file naming, plain ASCII text, and that English lessons
  match the in-app lessons in `src/content/lessons.ts`.
- Versioning: semantic versioning per pack. Lesson `id`s are stable across
  languages so progress can follow the child when the family changes language.
- Mini-games: a pack only references a game by kind and id. Game code lives in
  the app, is reviewed like any other code, and never receives keys.

### Planned packs

| Pack | Band | Language | Status |
| --- | --- | --- | --- |
| `basics-6-9` | 6 to 9 | en | Example exists |
| `basico-6-9` | 6 to 9 | pt-BR | Open, first community track |
| `bitcoin-10-13` | 10 to 13 | en | Open: interest and time, what Bitcoin is, guardians |
| `real-world-14-17` | 14 to 17 | en | Open: budgets, scams, self-custody |
| `hand-over-18` | 18 | en | Open: ceremony reading |

## Enforced by code vs by governance

| Rule | Enforced by |
| --- | --- |
| Pack structure and lengths | JSON Schema, checked in CI |
| Plain ASCII, no em dashes | Test in CI |
| No requests for secrets, no financial advice, age-appropriate text | Human review with the "Content pack" pull request checklist |
| Who can merge a pack | Repository maintainers |

## Open questions

1. Text license for packs: MIT like the code, or CC BY 4.0?
2. Should the app load packs at runtime from GitHub Pages, or only bundle them?
   Runtime loading adds a network peer to the CSP.
3. Review rule: how many reviewers per language, and must one be a teacher?
4. Images inside packs: allowed, and under what rules?

## History

- 2026-11-02: format, schema, example pack and validation test.

# Content packs

Lessons, quizzes and mini-game references for Kids Wallet are shipped as
content packs: plain JSON files that the community writes, reviews and
versions in this folder. The app does not depend on a server to load them;
packs are bundled at build time or fetched from this repository's GitHub
Pages copy.

RFC: [docs/rfcs/0006-content-packs-and-community.md](../docs/rfcs/0006-content-packs-and-community.md).

## Layout

```
content/
  schema.json                JSON Schema (draft 2020-12) every pack must pass
  packs/<language>/<id>.json One pack per file
```

`<language>` is a BCP 47 tag (`en`, `pt-BR`). `<id>` matches the `id` field
inside the file.

## Pack format

```json
{
  "format": "kids-wallet-content-pack",
  "formatVersion": 1,
  "id": "basics-6-9",
  "version": "1.0.0",
  "language": "en",
  "ageBand": "6-9",
  "title": "Money basics",
  "description": "What money is, saving, keys and the vault, for ages 6 to 9.",
  "authors": [{ "name": "Kids Wallet contributors", "url": "https://github.com/Hitice/kids-wallet" }],
  "license": "CC-BY-4.0",
  "lessons": [
    {
      "id": "what-money-is",
      "title": "What money is",
      "paragraphs": ["..."],
      "tryThis": "...",
      "quiz": [{ "prompt": "...", "choices": ["...", "..."], "answer": 0, "explanation": "..." }],
      "game": { "kind": "match", "ref": "coins-and-notes" }
    }
  ]
}
```

- `ageBand` is one of `6-9`, `10-13`, `14-17`, `18`. One pack covers one band.
- `lessons[].quiz` and `lessons[].game` are optional. `game.ref` points to a
  mini-game shipped with the app; packs carry no code.
- `version` follows semantic versioning. A pack that changes a lesson's
  meaning bumps the major version; wording fixes bump the patch.
- Text is plain. No HTML, no Markdown, no links inside paragraphs. No em
  dashes and no emojis, so the text renders the same on every device.
- Packs hold no secrets and no personal data about any child. A reviewer
  rejects any pack that asks the child to type a phrase, key or password.

## Rules for text

- Written for the child, read with a parent. Short sentences at 6 to 9.
- No price predictions, no "buy" or "sell", no comparison with other
  investments. Saving concepts only (see `tutor/persona.md`).
- Every rule of the vault is described as what enforces it: the Bitcoin
  script, the guardians' governance, or only the app.

## Validation

`src/content/pack.test.ts` validates every file under `content/packs/` against
`content/schema.json` with Ajv (strict mode) and checks that the English
lessons match `src/content/lessons.ts`. Run `npm test`.

## Contributing a pack

1. Copy `packs/en/basics-6-9.json` to `packs/<language>/<id>.json`.
2. Translate or write the lessons. Keep lesson `id`s stable across languages
   so progress can be matched between packs.
3. Run `npm test` and open a pull request with the "Content pack" template.

The first community track is Brazilian Portuguese (`pt-BR`).

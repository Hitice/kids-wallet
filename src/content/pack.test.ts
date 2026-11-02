/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { LESSONS } from './lessons';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PACKS = `${ROOT}content/packs/`;

interface Pack {
  id: string;
  language: string;
  lessons: { id: string; title: string; paragraphs: string[]; tryThis: string }[];
}

function packFiles(): string[] {
  const out: string[] = [];
  for (const lang of readdirSync(PACKS)) {
    const dir = `${PACKS}${lang}/`;
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) if (f.endsWith('.json')) out.push(`${dir}${f}`);
  }
  return out;
}

describe('content packs', () => {
  const schema = JSON.parse(readFileSync(`${ROOT}content/schema.json`, 'utf8'));
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  const validate = ajv.compile(schema);
  const files = packFiles();

  it('finds the example pack', () => {
    expect(files.some((f) => f.endsWith('content/packs/en/basics-6-9.json'))).toBe(true);
  });

  for (const file of files) {
    const rel = file.slice(ROOT.length);
    const pack = JSON.parse(readFileSync(file, 'utf8')) as Pack;

    it(`${rel} matches the schema`, () => {
      const ok = validate(pack);
      expect(ok, ajv.errorsText(validate.errors, { separator: '\n' })).toBe(true);
    });

    it(`${rel} is named after its id and language`, () => {
      expect(rel).toBe(`content/packs/${pack.language}/${pack.id}.json`);
      const ids = pack.lessons.map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it(`${rel} is plain ASCII without em dashes`, () => {
      const text = readFileSync(file, 'utf8');
      expect(text).not.toMatch(/\u2014/);
      // eslint-disable-next-line no-control-regex
      expect(text).toMatch(/^[\x09\x0a\x20-\x7e]*$/);
    });

    if (pack.language === 'en') {
      it(`${rel} lessons match src/content/lessons.ts`, () => {
        for (const lesson of pack.lessons) {
          const source = LESSONS.find((l) => l.id === lesson.id);
          expect(source, `lesson ${lesson.id} exists in lessons.ts`).toBeDefined();
          expect(lesson.title).toBe(source!.title);
          expect(lesson.paragraphs).toEqual(source!.paragraphs);
          expect(lesson.tryThis).toBe(source!.tryThis);
        }
      });
    }
  }

  it('rejects a pack that asks for secrets or breaks the format', () => {
    const base = JSON.parse(readFileSync(`${PACKS}en/basics-6-9.json`, 'utf8'));
    expect(validate({ ...base, ageBand: '5-9' })).toBe(false);
    expect(validate({ ...base, version: '1.0' })).toBe(false);
    expect(validate({ ...base, language: 'pt_BR' })).toBe(false);
    expect(validate({ ...base, extra: true })).toBe(false);
    expect(validate({ ...base, lessons: [] })).toBe(false);
    expect(validate({ ...base, lessons: [{ ...base.lessons[0], quiz: [{ prompt: 'x', choices: ['a'], answer: 0 }] }] })).toBe(false);
    expect(validate({ ...base, language: 'pt-BR', id: 'basico-6-9' })).toBe(true);
  });
});

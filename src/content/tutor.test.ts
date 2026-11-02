/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AGE_BANDS, ageBand } from './tutor';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** Files whose text must be plain ASCII (no em dashes, no emojis). */
function textFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string, accept: (f: string) => boolean) => {
    for (const name of readdirSync(dir)) {
      const path = `${dir}${name}`;
      if (statSync(path).isDirectory()) {
        if (name !== 'node_modules' && name !== 'dist' && name !== '.git') walk(`${path}/`, accept);
      } else if (accept(path)) {
        out.push(path);
      }
    }
  };
  const md = (f: string) => f.endsWith('.md');
  walk(`${ROOT}docs/`, md);
  walk(`${ROOT}tutor/`, md);
  walk(`${ROOT}content/`, (f) => f.endsWith('.md') || f.endsWith('.json'));
  walk(`${ROOT}.github/`, (f) => f.endsWith('.md') || f.endsWith('.yml'));
  for (const f of ['index.html', 'vite.config.ts', 'public/manifest.webmanifest']) out.push(`${ROOT}${f}`);
  walk(`${ROOT}src/`, (f) => f.endsWith('.ts') || f.endsWith('.tsx'));
  for (const f of ['README.md', 'CONTRIBUTING.md']) out.push(`${ROOT}${f}`);
  return out;
}

describe('tutor demo', () => {
  it('ships the four age bands in order', () => {
    expect(AGE_BANDS.map((b) => b.id)).toEqual(['6-9', '10-13', '14-17', '18']);
    expect(ageBand('14-17').label).toBe('14 to 17');
    expect(() => ageBand('x' as never)).toThrow();
  });

  it('copies each demo prompt from tutor/prompts at build time', () => {
    for (const band of AGE_BANDS) {
      const file = readFileSync(`${ROOT}tutor/prompts/${band.promptFile}`, 'utf8');
      expect(band.prompt).toBe(file);
      expect(band.prompt.length).toBeGreaterThan(400);
    }
    const files = readdirSync(`${ROOT}tutor/prompts/`).sort();
    expect(files).toEqual(AGE_BANDS.map((b) => b.promptFile).sort());
  });

  it('keeps the persona rules in every prompt', () => {
    for (const band of AGE_BANDS) {
      const p = band.prompt.toLowerCase();
      expect(p, band.id).toContain('never ask for');
      expect(p, band.id).toMatch(/do not hold keys|cannot move/);
      expect(p, band.id).toMatch(/trusted adult|grown-up/);
      expect(p, band.id).toMatch(/no (financial|money) advice/);
    }
    const persona = readFileSync(`${ROOT}tutor/persona.md`, 'utf8');
    expect(persona).toMatch(/never asks for/);
    expect(persona).toMatch(/Escalation/);
  });

  it('has canned exchanges that never show a secret', () => {
    for (const band of AGE_BANDS) {
      expect(band.exchanges.length).toBeGreaterThanOrEqual(3);
      for (const e of band.exchanges) {
        expect(e.question.length).toBeGreaterThan(5);
        expect(e.answer.length).toBeGreaterThan(40);
        expect(e.answer).not.toMatch(/abandon abandon|zoo zoo/);
      }
    }
  });
});

describe('writing rules', () => {
  it('uses plain ASCII with no em dashes or emojis in docs, prompts, content and UI copy', () => {
    const offenders: string[] = [];
    for (const file of textFiles()) {
      const text = readFileSync(file, 'utf8');
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        // eslint-disable-next-line no-control-regex
        if (/[^\x09\x20-\x7e]/.test(line)) offenders.push(`${file.slice(ROOT.length)}:${i + 1}: ${line.trim().slice(0, 80)}`);
      });
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});

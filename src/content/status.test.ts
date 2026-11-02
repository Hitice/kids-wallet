/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { rfcPath, STATUS_ITEMS, statusTableMarkdown } from './status';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

describe('project status', () => {
  it('has every RFC it links to', () => {
    for (const item of STATUS_ITEMS) {
      if (!item.rfc) continue;
      expect(() => readFileSync(`${ROOT}${rfcPath(item.rfc!)}`, 'utf8'), `RFC ${item.rfc}`).not.toThrow();
    }
  });

  it('is printed verbatim in README.md', () => {
    const readme = readFileSync(`${ROOT}README.md`, 'utf8');
    const table = statusTableMarkdown();
    expect(readme.includes(table), `README.md must contain this table:\n\n${table}\n`).toBe(true);
  });

  it('matches each RFC file status line', () => {
    for (const item of STATUS_ITEMS) {
      if (!item.rfc) continue;
      const rfc = readFileSync(`${ROOT}${rfcPath(item.rfc)}`, 'utf8');
      const match = /^Status: (.+)$/m.exec(rfc);
      expect(match, `RFC ${item.rfc} has a "Status:" line`).not.toBeNull();
      // One RFC can back several areas (0006), so only the "Ready" and "In development" rows are checked.
      if (item.status === 'ready') expect(match![1]).toBe('Ready');
      if (item.status === 'in-development') expect(match![1]).toBe('In development');
    }
  });
});

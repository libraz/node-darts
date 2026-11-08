/**
 * Build -> save -> load -> search matrix. The rows are a pairwise covering
 * array over the build/load dimensions (backend, values, key order,
 * duplicates, charset, load mode, entry API, empty key); the empty key is
 * only generated for the darts backend because clone rejects it.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Backend } from '../../src';
import {
  Builder,
  buildAndSaveDictionary,
  buildAndSaveDictionarySync,
  loadDictionary,
  TextDarts,
} from '../../src';

type Row = {
  backend: Backend;
  values: 'omitted' | 'explicit';
  order: 'sorted' | 'reverse' | 'shuffled';
  duplicates: 'none' | 'some';
  charset: 'ascii' | 'japanese' | 'emoji' | 'mixed';
  loadMode: 'auto' | 'explicit';
  api: 'fnSync' | 'fnAsync' | 'builderSync' | 'textDartsSync';
  emptyKey: 'no' | 'yes';
};

const COLUMNS = [
  'backend',
  'values',
  'order',
  'duplicates',
  'charset',
  'loadMode',
  'api',
  'emptyKey',
] as const;

// prettier-ignore
const TABLE: ReadonlyArray<
  readonly [string, string, string, string, string, string, string, string]
> = [
  ['darts', 'omitted', 'shuffled', 'none', 'emoji', 'auto', 'textDartsSync', 'no'],
  ['clone', 'explicit', 'sorted', 'none', 'ascii', 'explicit', 'fnSync', 'no'],
  ['darts', 'omitted', 'reverse', 'some', 'mixed', 'explicit', 'fnAsync', 'no'],
  ['darts', 'explicit', 'reverse', 'some', 'japanese', 'auto', 'fnSync', 'yes'],
  ['clone', 'omitted', 'sorted', 'some', 'ascii', 'auto', 'builderSync', 'no'],
  ['clone', 'explicit', 'shuffled', 'none', 'japanese', 'explicit', 'fnAsync', 'no'],
  ['darts', 'explicit', 'shuffled', 'none', 'mixed', 'explicit', 'builderSync', 'yes'],
  ['clone', 'omitted', 'shuffled', 'some', 'mixed', 'auto', 'fnSync', 'no'],
  ['darts', 'explicit', 'reverse', 'none', 'emoji', 'explicit', 'textDartsSync', 'yes'],
  ['darts', 'omitted', 'sorted', 'some', 'ascii', 'auto', 'fnAsync', 'yes'],
  ['darts', 'explicit', 'shuffled', 'some', 'ascii', 'explicit', 'textDartsSync', 'yes'],
  ['darts', 'explicit', 'sorted', 'none', 'mixed', 'auto', 'textDartsSync', 'yes'],
  ['darts', 'omitted', 'sorted', 'some', 'japanese', 'auto', 'textDartsSync', 'yes'],
  ['darts', 'omitted', 'sorted', 'none', 'japanese', 'auto', 'builderSync', 'yes'],
  ['clone', 'explicit', 'reverse', 'some', 'emoji', 'explicit', 'builderSync', 'no'],
  ['darts', 'omitted', 'sorted', 'some', 'emoji', 'auto', 'fnSync', 'yes'],
  ['clone', 'explicit', 'sorted', 'none', 'emoji', 'explicit', 'fnAsync', 'no'],
  ['clone', 'omitted', 'reverse', 'some', 'ascii', 'auto', 'builderSync', 'no'],
  ['clone', 'omitted', 'shuffled', 'some', 'emoji', 'auto', 'textDartsSync', 'no'],
];

const ROWS: Row[] = TABLE.map(
  (cells) => Object.fromEntries(COLUMNS.map((c, i) => [c, cells[i]])) as unknown as Row
);

// Each set contains prefix chains so commonPrefixSearch has several hits.
const KEYS: Record<Row['charset'], string[]> = {
  ascii: ['a', 'ab', 'abc', 'abd', 'b', 'banana', 'band', 'zeta'],
  japanese: ['あ', 'あい', 'あいう', '日本', '日本語', '日本語学', 'かな', 'カナ'],
  emoji: ['😀', '😀😀', '😀😀😀', '😀a', '👍', '👍🏽', '🇯🇵', 'x😀'],
  mixed: ['a', 'a日', 'a日本', 'a日本😀', '日', '😀', '😀日', 'é', 'éa'],
};

const MISSES: Record<Row['charset'], string[]> = {
  ascii: ['abe', 'bandx', 'zet', 'q', 'abcd'],
  japanese: ['あう', '日', '日本語学校', 'カ', 'ん'],
  emoji: ['😀😀😀😀', '👎', '🇯', 'x', '😀b'],
  mixed: ['a日本😀x', 'b', '日本', 'ée', '😀日本'],
};

/** Deterministic shuffle (LCG) so the permutation never changes. */
function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  let state = 12345;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function orderKeys(keys: string[], order: Row['order']): string[] {
  const sorted = [...keys].sort();
  if (order === 'sorted') return sorted;
  if (order === 'reverse') return sorted.reverse();
  return shuffled(sorted);
}

function buildInput(row: Row) {
  const base = orderKeys(KEYS[row.charset], row.order);
  const keys = row.emptyKey === 'yes' ? ['', ...base] : [...base];
  if (row.duplicates === 'some') {
    // Repeat two keys at the end; the first occurrence must win.
    keys.push(base[0], base[Math.floor(base.length / 2)]);
  }
  const values =
    row.values === 'explicit'
      ? keys.map((_k, i) =>
          i < keys.length - 2 || row.duplicates === 'none' ? 100 + i * 7 : 9000 + i
        )
      : undefined;

  const expected = new Map<string, number>();
  keys.forEach((key, i) => {
    if (!expected.has(key)) expected.set(key, values ? values[i] : i);
  });
  return { keys, values, expected };
}

describe('build -> save -> load -> search matrix', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-darts-matrix-'));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('has the generated table in the declared shape', () => {
    expect(ROWS).toHaveLength(19);
    for (const row of ROWS) {
      if (row.emptyKey === 'yes') expect(row.backend).toBe('darts');
    }
  });

  describe.each(ROWS.map((row, i) => ({ ...row, id: i })))(
    'row $id: $backend values=$values order=$order dup=$duplicates charset=$charset load=$loadMode api=$api empty=$emptyKey',
    (row) => {
      it('round-trips every key through save and reload', async () => {
        const { keys, values, expected } = buildInput(row);
        const file = path.join(tempDir, `row-${row.id}.darts`);
        const options = { backend: row.backend };

        let ok: boolean;
        switch (row.api) {
          case 'fnSync':
            ok = buildAndSaveDictionarySync(keys, file, values, options);
            break;
          case 'fnAsync':
            ok = await buildAndSaveDictionary(keys, file, values, options);
            break;
          case 'builderSync':
            ok = new Builder().buildAndSaveSync(keys, file, values, options);
            break;
          default:
            ok = TextDarts.buildAndSaveSync(keys, file, values, options);
        }
        expect(ok).toBe(true);
        expect(fs.statSync(file).size).toBeGreaterThan(0);

        const dict = loadDictionary(
          file,
          row.loadMode === 'explicit' ? { backend: row.backend } : undefined
        );
        try {
          expect(dict.getBackend()).toBe(row.backend);

          for (const [key, value] of expected) {
            expect(dict.exactMatchSearch(key), `exact ${JSON.stringify(key)}`).toBe(value);
            expect(dict.commonPrefixSearch(key), `prefix ${JSON.stringify(key)}`).toContain(value);
          }

          for (const miss of MISSES[row.charset]) {
            expect(expected.has(miss)).toBe(false);
            expect(dict.exactMatchSearch(miss), `miss ${JSON.stringify(miss)}`).toBe(-1);
          }

          // Prefix hits come back shortest first and cover exactly the stored prefixes.
          const longest = [...expected.keys()].sort((a, b) => b.length - a.length)[0];
          const probe = `${longest}!`;
          const want = [...expected.entries()]
            .filter(([k]) => probe.startsWith(k))
            .sort((a, b) => Buffer.byteLength(a[0]) - Buffer.byteLength(b[0]))
            .map(([, v]) => v);
          expect(dict.commonPrefixSearch(probe)).toEqual(want);
        } finally {
          dict.dispose();
        }
      });
    }
  );
});

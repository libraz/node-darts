/**
 * Build -> save -> load -> search matrix. The rows are a pairwise covering
 * array over the build/load dimensions (backend, values, key order,
 * duplicates, charset, load mode, persistence path, empty key); the empty key
 * is only generated for the darts backend because clone rejects it.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Backend, Dictionary } from '../../src';

type Row = {
  backend: Backend;
  values: 'omitted' | 'explicit';
  order: 'sorted' | 'reverse' | 'shuffled';
  duplicates: 'none' | 'some';
  charset: 'ascii' | 'japanese' | 'emoji' | 'mixed';
  loadMode: 'auto' | 'explicit';
  api: 'saveSync' | 'save' | 'bytes' | 'bytesBuffer';
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
  ['darts', 'omitted', 'shuffled', 'none', 'emoji', 'auto', 'bytesBuffer', 'no'],
  ['clone', 'explicit', 'sorted', 'none', 'ascii', 'explicit', 'saveSync', 'no'],
  ['darts', 'omitted', 'reverse', 'some', 'mixed', 'explicit', 'save', 'no'],
  ['darts', 'explicit', 'reverse', 'some', 'japanese', 'auto', 'saveSync', 'yes'],
  ['clone', 'omitted', 'sorted', 'some', 'ascii', 'auto', 'bytes', 'no'],
  ['clone', 'explicit', 'shuffled', 'none', 'japanese', 'explicit', 'save', 'no'],
  ['darts', 'explicit', 'shuffled', 'none', 'mixed', 'explicit', 'bytes', 'yes'],
  ['clone', 'omitted', 'shuffled', 'some', 'mixed', 'auto', 'saveSync', 'no'],
  ['darts', 'explicit', 'reverse', 'none', 'emoji', 'explicit', 'bytesBuffer', 'yes'],
  ['darts', 'omitted', 'sorted', 'some', 'ascii', 'auto', 'save', 'yes'],
  ['darts', 'explicit', 'shuffled', 'some', 'ascii', 'explicit', 'bytesBuffer', 'yes'],
  ['darts', 'explicit', 'sorted', 'none', 'mixed', 'auto', 'bytesBuffer', 'yes'],
  ['darts', 'omitted', 'sorted', 'some', 'japanese', 'auto', 'bytesBuffer', 'yes'],
  ['darts', 'omitted', 'sorted', 'none', 'japanese', 'auto', 'bytes', 'yes'],
  ['clone', 'explicit', 'reverse', 'some', 'emoji', 'explicit', 'bytes', 'no'],
  ['darts', 'omitted', 'sorted', 'some', 'emoji', 'auto', 'saveSync', 'yes'],
  ['clone', 'explicit', 'sorted', 'none', 'emoji', 'explicit', 'save', 'no'],
  ['clone', 'omitted', 'reverse', 'some', 'ascii', 'auto', 'bytes', 'no'],
  ['clone', 'omitted', 'shuffled', 'some', 'emoji', 'auto', 'bytesBuffer', 'no'],
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

        const built = Dictionary.build(
          values ? keys.map((k, i) => [k, values[i]] as const) : keys,
          options
        );
        let dict: Dictionary;
        try {
          expect(built.backend).toBe(row.backend);
          const loadOptions = row.loadMode === 'explicit' ? options : undefined;
          switch (row.api) {
            case 'saveSync':
              built.saveSync(file);
              dict = Dictionary.loadSync(file, loadOptions);
              break;
            case 'save':
              await built.save(file);
              dict = await Dictionary.load(file, loadOptions);
              break;
            case 'bytes':
              dict = Dictionary.fromBytes(built.toBytes(), loadOptions);
              break;
            default:
              dict = Dictionary.fromBytes(Buffer.from(built.toBytes()), loadOptions);
          }
        } finally {
          built.dispose();
        }
        if (row.api === 'saveSync' || row.api === 'save') {
          expect(fs.statSync(file).size).toBeGreaterThan(0);
        }
        try {
          expect(dict.backend).toBe(row.backend);

          for (const [key, value] of expected) {
            expect(dict.exactMatchSearch(key), `exact ${JSON.stringify(key)}`).toBe(value);
            const hit = dict.commonPrefixSearch(key).at(-1);
            if (key !== '')
              expect(hit, `prefix ${JSON.stringify(key)}`).toEqual({ value, length: key.length });
          }

          for (const miss of MISSES[row.charset]) {
            expect(expected.has(miss)).toBe(false);
            expect(dict.exactMatchSearch(miss), `miss ${JSON.stringify(miss)}`).toBeUndefined();
          }

          // Prefix hits come back shortest first and cover exactly the stored prefixes.
          const longest = [...expected.keys()].sort((a, b) => b.length - a.length)[0];
          const probe = `${longest}!`;
          const want = [...expected.entries()]
            .filter(([k]) => k !== '' && probe.startsWith(k))
            .sort((a, b) => a[0].length - b[0].length)
            .map(([k, v]) => ({ value: v, length: k.length }));
          expect(dict.commonPrefixSearch(probe)).toEqual(want);
        } finally {
          dict.dispose();
        }
      });
    }
  );
});

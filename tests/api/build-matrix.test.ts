/**
 * Pairwise coverage of Dictionary.build inputs.
 *
 * Model (2-wise, generated with coverwise):
 *   form       {strings, tuples, map}
 *   backend    {darts, clone}
 *   duplicates {none, present}
 *   value      {index, zero, max}
 *   keys       {ascii, japanese, astral}
 * Constraints: form = strings ⇔ value = index.
 */
import { describe, expect, it } from 'vitest';
import { type Backend, type BuildInput, Dictionary } from '../../src';

type Form = 'strings' | 'tuples' | 'map';
type Row = {
  form: Form;
  backend: Backend;
  duplicates: 'none' | 'present';
  value: 'index' | 'zero' | 'max';
  keys: 'ascii' | 'japanese' | 'astral';
};

const ROWS: Row[] = [
  { form: 'tuples', backend: 'darts', duplicates: 'none', value: 'max', keys: 'ascii' },
  { form: 'map', backend: 'clone', duplicates: 'present', value: 'zero', keys: 'ascii' },
  { form: 'tuples', backend: 'clone', duplicates: 'present', value: 'max', keys: 'astral' },
  { form: 'strings', backend: 'darts', duplicates: 'present', value: 'index', keys: 'japanese' },
  { form: 'strings', backend: 'clone', duplicates: 'none', value: 'index', keys: 'astral' },
  { form: 'tuples', backend: 'darts', duplicates: 'none', value: 'zero', keys: 'japanese' },
  { form: 'strings', backend: 'darts', duplicates: 'none', value: 'index', keys: 'ascii' },
  { form: 'strings', backend: 'clone', duplicates: 'present', value: 'index', keys: 'japanese' },
  { form: 'map', backend: 'darts', duplicates: 'present', value: 'zero', keys: 'astral' },
  { form: 'map', backend: 'darts', duplicates: 'present', value: 'max', keys: 'japanese' },
  { form: 'map', backend: 'darts', duplicates: 'none', value: 'max', keys: 'ascii' },
];

const KEYS: Record<Row['keys'], string[]> = {
  ascii: ['banana', 'app', 'apple'],
  japanese: ['東京都', '東京', '京都'],
  astral: ['😀😃', '𠮷野家', '😀'],
};

const VALUES: Record<'zero' | 'max', { value: number; duplicate: number }> = {
  zero: { value: 0, duplicate: 1 },
  max: { value: 2147483647, duplicate: 2147483646 },
};

/** The build input for `row` and the value each distinct key must map to. */
function scenario(row: Row): { input: BuildInput; expected: Map<string, number> } {
  const keys = KEYS[row.keys];
  // The duplicate repeats the first key; a tuple duplicate carries a different value.
  const withDup = row.duplicates === 'present' ? [...keys, keys[0]] : keys;
  if (row.form === 'strings') {
    const expected = new Map<string, number>();
    withDup.forEach((k, i) => {
      if (!expected.has(k)) expected.set(k, i);
    });
    return { input: withDup, expected };
  }
  const { value, duplicate } = VALUES[row.value as 'zero' | 'max'];
  const entries = withDup.map((k, i): [string, number] => [k, i < keys.length ? value : duplicate]);
  if (row.form === 'tuples') {
    return { input: entries, expected: new Map(keys.map((k) => [k, value])) };
  }
  // A Map de-duplicates itself; it holds whatever value it was last given.
  const map = new Map(entries);
  return { input: map, expected: new Map(map) };
}

describe('Dictionary.build pairwise matrix', () => {
  it.each(ROWS)(
    'form=$form backend=$backend duplicates=$duplicates value=$value keys=$keys',
    (row) => {
      const { input, expected } = scenario(row);
      const dict = Dictionary.build(input, { backend: row.backend });
      expect(dict.backend).toBe(row.backend);
      for (const [key, value] of expected) {
        expect(dict.exactMatchSearch(key)).toBe(value);
        const matches = dict.commonPrefixSearch(key);
        expect(matches.at(-1)).toEqual({ value, length: key.length });
        for (const m of matches) {
          expect(dict.exactMatchSearch(key.slice(0, m.length))).toBe(m.value);
        }
      }
      const copy = Dictionary.fromBytes(dict.toBytes());
      expect(copy.backend).toBe(row.backend);
      for (const [key, value] of expected) {
        expect(copy.exactMatchSearch(key)).toBe(value);
      }
      copy.dispose();
      dict.dispose();
    }
  );
});

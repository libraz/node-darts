/**
 * Backend switching for the two double-array layouts.
 *
 * Verifies:
 *  - both backends build and search identically
 *  - an explicit { backend } is honoured by build, load, loadSync and fromBytes
 *  - load auto-detect picks darts-clone first and falls back to Darts 0.32
 *  - `backend` reports the layout a dictionary holds
 *  - a file of the other layout is rejected when its backend is forced
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Backend, Dictionary, InvalidDictionaryError } from '../../src';

const ENTRIES: [string, number][] = [
  ['apple', 1],
  ['banana', 2],
  ['orange', 3],
  ['pineapple', 4],
  ['strawberry', 5],
];

describe.each<Backend>(['darts', 'clone'])('backend=%s', (backend) => {
  let tempDir: string;
  let dictFile: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `node-darts-backend-${backend}-`));
    dictFile = path.join(tempDir, 'fruits.darts');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('builds and searches with an explicit backend', () => {
    using dict = Dictionary.build(ENTRIES, { backend });
    expect(dict.backend).toBe(backend);
    expect(dict.exactMatchSearch('apple')).toBe(1);
    expect(dict.exactMatchSearch('grape')).toBeUndefined();
    expect(dict.commonPrefixSearch('pineapple')).toEqual([{ value: 4, length: 9 }]);
  });

  it('save then auto-detect reload preserves the backend', () => {
    using built = Dictionary.build(ENTRIES, { backend });
    built.saveSync(dictFile);

    using reloaded = Dictionary.loadSync(dictFile);
    expect(reloaded.backend).toBe(backend);
    expect(reloaded.exactMatchSearch('strawberry')).toBe(5);
  });

  it.each([
    ['load', (f: string) => Dictionary.load(f, { backend })],
    ['loadSync', (f: string) => Dictionary.loadSync(f, { backend })],
    ['fromBytes', (f: string) => Dictionary.fromBytes(fs.readFileSync(f), { backend })],
  ])('an explicit backend on %s matches the saved format', async (_name, open) => {
    using built = Dictionary.build(ENTRIES, { backend });
    built.saveSync(dictFile);
    using dict = await open(dictFile);
    expect(dict.backend).toBe(backend);
    expect(dict.exactMatchSearch('banana')).toBe(2);
  });

  it('gives the same search results as the other backend', () => {
    const other: Backend = backend === 'darts' ? 'clone' : 'darts';
    using a = Dictionary.build(ENTRIES, { backend });
    using b = Dictionary.build(ENTRIES, { backend: other });
    for (const text of ['apple', 'pineapples', 'straw', 'banana!', 'zzz', '']) {
      expect(a.exactMatchSearch(text)).toBe(b.exactMatchSearch(text));
      expect(a.commonPrefixSearch(text)).toEqual(b.commonPrefixSearch(text));
      expect(a.traverse(text)).toEqual(b.traverse(text));
    }
    expect(a.replaceWords('apple pie', (w, v) => `${w}${v}`)).toBe(
      b.replaceWords('apple pie', (w, v) => `${w}${v}`)
    );
  });
});

describe('cross-backend on-disk format incompatibility', () => {
  let tempDir: string;
  let dartsFile: string;
  let cloneFile: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-darts-cross-'));
    dartsFile = path.join(tempDir, 'darts.darts');
    cloneFile = path.join(tempDir, 'clone.darts');
    Dictionary.build(ENTRIES, { backend: 'darts' }).saveSync(dartsFile);
    Dictionary.build(ENTRIES, { backend: 'clone' }).saveSync(cloneFile);
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('darts-clone refuses a Darts 0.32 file', () => {
    expect(() => Dictionary.loadSync(dartsFile, { backend: 'clone' })).toThrow(
      InvalidDictionaryError
    );
  });

  it('Darts 0.32 refuses a darts-clone file', () => {
    expect(() => Dictionary.loadSync(cloneFile, { backend: 'darts' })).toThrow(
      InvalidDictionaryError
    );
  });

  it('auto-detect picks darts-clone for a clone file', () => {
    using dict = Dictionary.loadSync(cloneFile);
    expect(dict.backend).toBe('clone');
    expect(dict.exactMatchSearch('apple')).toBe(1);
  });

  it('auto-detect falls back to Darts 0.32 for a Darts file', () => {
    using dict = Dictionary.loadSync(dartsFile);
    expect(dict.backend).toBe('darts');
    expect(dict.exactMatchSearch('apple')).toBe(1);
  });
});

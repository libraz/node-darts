/**
 * Backend switching tests for the dual-backend native addon.
 *
 * Verifies:
 *  - both backends build and search correctly
 *  - explicit { backend } option is honoured by build, load, and createDictionary
 *  - load auto-detect picks darts-clone first and falls back to taku910/darts
 *  - getBackend() reports the kind currently held by a dict
 *  - cross-backend on-disk format incompatibility is detected (clone rejects
 *    a taku910 file when explicitly told to use clone, and vice versa)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Backend, Dictionary } from '../../src';
import {
  buildAndSaveDictionarySync,
  buildDictionary,
  createDictionary,
  InvalidDictionaryError,
  loadDictionary,
  TextDarts,
} from '../../src';

const KEYS = ['apple', 'banana', 'orange', 'pineapple', 'strawberry'];
const VALUES = [1, 2, 3, 4, 5];

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

  it('builds + searches with explicit backend', () => {
    const dict = buildDictionary(KEYS, VALUES, { backend });
    expect(dict.getBackend()).toBe(backend);
    expect(dict.exactMatchSearch('apple')).toBe(1);
    expect(dict.exactMatchSearch('grape')).toBe(-1);
    expect(dict.commonPrefixSearch('pineapple')).toEqual([4]);
    dict.dispose();
  });

  it('build + save + auto-detect reload preserves backend', () => {
    const ok = buildAndSaveDictionarySync(KEYS, dictFile, VALUES, { backend });
    expect(ok).toBe(true);

    const reloaded = loadDictionary(dictFile);
    expect(reloaded.getBackend()).toBe(backend);
    expect(reloaded.exactMatchSearch('strawberry')).toBe(5);
    reloaded.dispose();
  });

  it('explicit backend on load matches saved format', () => {
    const dict = loadDictionary(dictFile, { backend });
    expect(dict.getBackend()).toBe(backend);
    expect(dict.exactMatchSearch('banana')).toBe(2);
    dict.dispose();
  });

  it('createDictionary honours backend kind', () => {
    const dict = createDictionary(backend);
    expect(dict.getBackend()).toBe(backend);
    dict.dispose();
  });

  it('TextDarts.build + load roundtrip with explicit backend', () => {
    const td = TextDarts.build(KEYS, VALUES, { backend });
    expect(td.getBackend()).toBe(backend);
    expect(td.exactMatchSearch('orange')).toBe(3);
    td.dispose();

    const loaded = TextDarts.load(dictFile, { backend });
    expect(loaded.getBackend()).toBe(backend);
    loaded.dispose();
  });
});

describe('cross-backend on-disk format incompatibility', () => {
  let tempDir: string;
  let dartsFile: string;
  let cloneFile: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-darts-cross-'));
    dartsFile = path.join(tempDir, 'taku910.darts');
    cloneFile = path.join(tempDir, 'clone.darts');
    buildAndSaveDictionarySync(KEYS, dartsFile, VALUES, { backend: 'darts' });
    buildAndSaveDictionarySync(KEYS, cloneFile, VALUES, { backend: 'clone' });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('darts-clone refuses to load a taku910 dictionary file', () => {
    expect(() => loadDictionary(dartsFile, { backend: 'clone' })).toThrow(InvalidDictionaryError);
  });

  it('taku910 backend forced on a clone file does not match keys', () => {
    // taku910 may "open" a clone file (no strict validation) but its internal
    // double-array structure is incompatible, so searches should not return
    // the original values.
    let dict: Dictionary;
    try {
      dict = loadDictionary(cloneFile, { backend: 'darts' });
    } catch {
      // If taku910 happens to reject the file, that's also acceptable.
      return;
    }
    expect(dict.getBackend()).toBe('darts');
    expect(dict.exactMatchSearch('apple')).not.toBe(1);
    dict.dispose();
  });

  it('auto-detect picks darts-clone for a clone file', () => {
    const dict = loadDictionary(cloneFile);
    expect(dict.getBackend()).toBe('clone');
    expect(dict.exactMatchSearch('apple')).toBe(1);
    dict.dispose();
  });

  it('auto-detect falls back to taku910 for a taku910 file', () => {
    const dict = loadDictionary(dartsFile);
    expect(dict.getBackend()).toBe('darts');
    expect(dict.exactMatchSearch('apple')).toBe(1);
    dict.dispose();
  });
});

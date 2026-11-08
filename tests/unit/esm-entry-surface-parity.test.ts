/**
 * The ESM entry must expose the same callable surface as the CJS entry.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as cjs from '../../src/index';
import * as esm from '../../src/index.esm';

const FUNCTIONS = [
  'createDictionary',
  'createBuilder',
  'loadDictionary',
  'buildDictionary',
  'buildAndSaveDictionary',
  'buildAndSaveDictionarySync',
  'ensureDirectoryExists',
  'fileExists',
  'sortAndUniqueStrings',
  'sortStrings',
  'uniqueArray',
  'validateFilePath',
] as const;

const CLASSES = [
  'Builder',
  'Dictionary',
  'TextDarts',
  'BuildError',
  'DartsError',
  'FileNotFoundError',
  'InvalidDictionaryError',
] as const;

describe('ESM entry surface parity', () => {
  it.each(FUNCTIONS)('exports %s as the same function', (name) => {
    expect(typeof esm[name]).toBe('function');
    expect(esm[name]).toBe(cjs[name]);
  });

  it.each(CLASSES)('exports %s as the same class', (name) => {
    expect(typeof esm[name]).toBe('function');
    expect(esm[name]).toBe(cjs[name]);
  });

  it('exposes every runtime export of the CJS entry', () => {
    const missing = Object.entries(cjs)
      .filter(([k, v]) => v !== undefined && !(k in esm))
      .map(([k]) => k);
    expect(missing).toEqual([]);
  });

  it('keeps the error hierarchy', () => {
    expect(new esm.FileNotFoundError('x')).toBeInstanceOf(esm.DartsError);
    expect(new esm.BuildError('x')).toBeInstanceOf(esm.DartsError);
    expect(new esm.InvalidDictionaryError('x')).toBeInstanceOf(esm.DartsError);
  });

  it.each(['darts', 'clone'] as const)(
    'builds, saves, loads and searches via ESM (%s)',
    async (backend) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-darts-esm-parity-'));
      try {
        const file = path.join(dir, 'd.darts');
        expect(await esm.buildAndSaveDictionary(['日本', 'abc'], file, [5, 6], { backend })).toBe(
          true
        );
        const dict = esm.loadDictionary(file);
        expect(dict).toBeInstanceOf(cjs.Dictionary);
        expect(dict.getBackend()).toBe(backend);
        expect(dict.exactMatchSearch('日本')).toBe(5);
        expect(dict.exactMatchSearch('abc')).toBe(6);
        expect(dict.exactMatchSearch('ab')).toBe(-1);
        dict.dispose();

        const text = esm.TextDarts.load(file);
        expect(text.replaceWords('x日本y', (w) => `<${w}>`)).toBe('x<日本>y');
        text.dispose();
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  it('createBuilder and createDictionary produce usable instances', () => {
    const dict = esm.createBuilder().build(['k'], [3]);
    expect(dict.exactMatchSearch('k')).toBe(3);
    dict.dispose();
    const empty = esm.createDictionary('clone');
    expect(empty.getBackend()).toBe('clone');
    empty.dispose();
  });
});

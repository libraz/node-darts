/**
 * Error mapping of DartsNativeWrapper over the WebAssembly core: stale or
 * malformed handles, invalid arguments, unreadable and unwritable files, and
 * callback failures each surface as the library's error classes, and none of
 * them leaves the core unusable.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Backend } from '../../../src';
import {
  BuildError,
  DartsError,
  FileNotFoundError,
  InvalidDictionaryError,
} from '../../../src/core/errors';
import { dartsNative } from '../../../src/core/native';

let tempDir: string;
let dictPath: string;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-darts-wrapper-'));
  dictPath = path.join(tempDir, 'ok.darts');
  const handle = dartsNative.build(['apple', 'banana']);
  dartsNative.saveDictionary(handle, dictPath);
  dartsNative.destroyDictionary(handle);
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function staleHandle(): number {
  const handle = dartsNative.build(['x']);
  dartsNative.destroyDictionary(handle);
  return handle;
}

describe('handle validation', () => {
  const calls: Array<[string, (h: number) => unknown]> = [
    ['exactMatchSearch', (h) => dartsNative.exactMatchSearch(h, 'a')],
    ['commonPrefixSearch', (h) => dartsNative.commonPrefixSearch(h, 'a')],
    ['traverse', (h) => dartsNative.traverse(h, 'a', () => true)],
    ['size', (h) => dartsNative.size(h)],
    ['getBackend', (h) => dartsNative.getBackend(h)],
    ['saveDictionary', (h) => dartsNative.saveDictionary(h, path.join(tempDir, 'x.darts'))],
    ['loadDictionary', (h) => dartsNative.loadDictionary(h, dictPath)],
  ];

  it.each(calls)('%s rejects a destroyed handle', (_name, call) => {
    expect(() => call(staleHandle())).toThrow(DartsError);
    expect(() => call(staleHandle())).toThrow(/Invalid dictionary handle/);
  });

  it.each([-1, 1.5, Number.NaN, 2 ** 32])(
    'rejects the non-handle %s before it reaches the core',
    (bad) => {
      expect(() => dartsNative.size(bad)).toThrow(/Invalid dictionary handle/);
      expect(() => dartsNative.destroyDictionary(bad)).toThrow(/Invalid dictionary handle/);
    }
  );

  it('destroying an unknown handle is a no-op', () => {
    expect(() => dartsNative.destroyDictionary(staleHandle())).not.toThrow();
  });

  it('loadDictionaryAsync rejects a destroyed handle', async () => {
    await expect(dartsNative.loadDictionaryAsync(staleHandle(), dictPath)).rejects.toThrow(
      /Invalid dictionary handle/
    );
  });
});

describe('argument validation', () => {
  it('rejects an unknown backend at every entry point', () => {
    const bad = 'trie' as Backend;
    expect(() => dartsNative.createDictionary(bad)).toThrow(DartsError);
    expect(() => dartsNative.build(['a'], undefined, bad)).toThrow(BuildError);
    const handle = dartsNative.createDictionary();
    expect(() => dartsNative.loadDictionary(handle, dictPath, bad)).toThrow(InvalidDictionaryError);
    dartsNative.destroyDictionary(handle);
  });

  it('rejects a non-string search key', () => {
    const handle = dartsNative.build(['a']);
    const key = 1 as unknown as string;
    expect(() => dartsNative.exactMatchSearch(handle, key)).toThrow(/Search key must be a string/);
    expect(() => dartsNative.commonPrefixSearch(handle, key)).toThrow(DartsError);
    expect(() => dartsNative.traverse(handle, key, () => true)).toThrow(DartsError);
    dartsNative.destroyDictionary(handle);
  });

  it('rejects a non-function traverse callback', () => {
    const handle = dartsNative.build(['a']);
    const callback = 'nope' as unknown as () => boolean;
    expect(() => dartsNative.traverse(handle, 'a', callback)).toThrow(
      /callback must be a function/
    );
    dartsNative.destroyDictionary(handle);
  });

  it('rejects mismatched and non-numeric values', () => {
    expect(() => dartsNative.build(['a', 'b'], [1])).toThrow(/length must match/);
    expect(() => dartsNative.build(['a'], ['1' as unknown as number])).toThrow(
      'All values must be numbers'
    );
    expect(() => dartsNative.build(['a', 2 as unknown as string])).toThrow(
      'All keys must be strings'
    );
  });
});

describe('file errors', () => {
  it('saving a dictionary that holds no trie fails', () => {
    const handle = dartsNative.createDictionary();
    expect(() => dartsNative.saveDictionary(handle, path.join(tempDir, 'e.darts'))).toThrow(
      /dictionary is empty/
    );
    dartsNative.destroyDictionary(handle);
  });

  it('saving into a missing directory fails with DartsError', () => {
    const handle = dartsNative.build(['a']);
    const target = path.join(tempDir, 'missing', 'dir', 'x.darts');
    expect(() => dartsNative.saveDictionary(handle, target)).toThrow(DartsError);
    dartsNative.destroyDictionary(handle);
  });

  it('loading a directory fails with InvalidDictionaryError, sync and async', async () => {
    const handle = dartsNative.createDictionary();
    expect(() => dartsNative.loadDictionary(handle, tempDir)).toThrow(InvalidDictionaryError);
    await expect(dartsNative.loadDictionaryAsync(handle, tempDir)).rejects.toThrow(
      InvalidDictionaryError
    );
    dartsNative.destroyDictionary(handle);
  });

  it('loading a missing file fails with FileNotFoundError, sync and async', async () => {
    const handle = dartsNative.createDictionary();
    const missing = path.join(tempDir, 'nope.darts');
    expect(() => dartsNative.loadDictionary(handle, missing)).toThrow(FileNotFoundError);
    await expect(dartsNative.loadDictionaryAsync(handle, missing)).rejects.toThrow(
      FileNotFoundError
    );
    dartsNative.destroyDictionary(handle);
  });

  it('a rejected load leaves the previous dictionary in place', () => {
    const bad = path.join(tempDir, 'bad.darts');
    fs.writeFileSync(bad, 'not a dictionary');
    const handle = dartsNative.build(['kept'], undefined, 'clone');
    expect(() => dartsNative.loadDictionary(handle, bad, 'clone')).toThrow(InvalidDictionaryError);
    expect(dartsNative.exactMatchSearch(handle, 'kept')).toBe(0);
    expect(dartsNative.getBackend(handle)).toBe('clone');
    dartsNative.destroyDictionary(handle);
  });
});

describe('traverse callback', () => {
  it('wraps a throwing callback into DartsError and stays usable', () => {
    const handle = dartsNative.build(['abc']);
    expect(() =>
      dartsNative.traverse(handle, 'abc', () => {
        throw new Error('boom');
      })
    ).toThrow(/Failed to traverse: boom/);
    expect(dartsNative.exactMatchSearch(handle, 'abc')).toBe(0);
    dartsNative.destroyDictionary(handle);
  });

  it('allows searches and nested traversals from inside the callback', () => {
    const handle = dartsNative.build(['a', 'ab', 'abc', 'zzzzzzzz']);
    const outer: number[] = [];
    const inner: number[] = [];
    dartsNative.traverse(handle, 'abc', (r) => {
      outer.push(r.value);
      dartsNative.exactMatchSearch(handle, 'zzzzzzzz');
      dartsNative.traverse(handle, 'zzzzzzzz', (s) => {
        inner.push(s.value);
        return true;
      });
      return true;
    });
    expect(outer).toEqual([0, 1, 2]);
    expect(inner.at(-1)).toBe(3);
    dartsNative.destroyDictionary(handle);
  });
});

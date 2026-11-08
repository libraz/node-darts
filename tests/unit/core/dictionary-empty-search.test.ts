/**
 * Searching a dictionary that holds no trie — freshly created, or left empty
 * by a failed load — must behave like a miss on both backends, at both the
 * Dictionary layer and the exported native wrapper.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Backend } from '../../../src';
import { createDictionary, InvalidDictionaryError } from '../../../src';
import { dartsNative } from '../../../src/core/native';

const BACKENDS: Backend[] = ['darts', 'clone'];

describe.each(BACKENDS)('empty dictionary search (%s)', (backend) => {
  it('traverse on a never-loaded dictionary reports nothing', () => {
    const dict = createDictionary(backend);
    const seen: number[] = [];
    dict.traverse('abc', (r) => {
      seen.push(r.value);
      return true;
    });
    expect(seen).toEqual([]);
    dict.dispose();
  });

  it('native exactMatchSearch / commonPrefixSearch on an empty handle are misses', () => {
    const handle = dartsNative.createDictionary(backend);
    expect(dartsNative.exactMatchSearch(handle, 'abc')).toBe(-1);
    expect(dartsNative.commonPrefixSearch(handle, 'abc')).toEqual([]);
    dartsNative.destroyDictionary(handle);
  });
});

// Only darts-clone validates the file format, so only it can leave a handle
// empty after a load attempt; taku910 accepts arbitrary bytes.
describe('empty dictionary search after a rejected load (clone)', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-darts-empty-'));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('traverse after a failed explicit-backend load reports nothing', () => {
    const badFile = path.join(tempDir, 'bad.darts');
    fs.writeFileSync(badFile, 'not a dictionary');
    const dict = createDictionary('clone');
    expect(() => dict.loadSync(badFile, { backend: 'clone' })).toThrow(InvalidDictionaryError);
    const seen: number[] = [];
    dict.traverse('abc', (r) => {
      seen.push(r.value);
      return true;
    });
    expect(seen).toEqual([]);
    dict.dispose();
  });
});

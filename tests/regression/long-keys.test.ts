/**
 * Building is independent of key length: a key far longer than the
 * WebAssembly stack could hold one frame per byte for builds, saves, reloads
 * and searches on both backends.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Backend } from '../../src';
import { buildAndSaveDictionarySync, buildDictionary, loadDictionary } from '../../src';

const BACKENDS: Backend[] = ['darts', 'clone'];

describe.each(BACKENDS)('long keys (%s)', (backend) => {
  it('builds, saves, reloads and searches a 1,000,000-character key', () => {
    const long = 'a'.repeat(1_000_000);
    const branch = `${'a'.repeat(500_000)}c`;
    const dict = buildDictionary([long, branch, 'b'], [1, 3, 2], { backend });
    expect(dict.exactMatchSearch(long)).toBe(1);
    expect(dict.exactMatchSearch(branch)).toBe(3);
    expect(dict.exactMatchSearch('a'.repeat(999_999))).toBe(-1);
    expect(dict.commonPrefixSearch(`${long}zz`)).toEqual([1]);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-darts-long-'));
    try {
      const file = path.join(dir, 'long.darts');
      expect(dict.getBackend()).toBe(backend);
      buildAndSaveDictionarySync([long, branch, 'b'], file, [1, 3, 2], { backend });
      const reloaded = loadDictionary(file, { backend });
      expect(reloaded.exactMatchSearch(long)).toBe(1);
      reloaded.dispose();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      dict.dispose();
    }
  });
});

/**
 * Building is independent of key length: a key far longer than the
 * WebAssembly stack could hold one frame per byte for builds, saves, reloads
 * and searches on both backends.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Backend, Dictionary } from '../../src';

const BACKENDS: Backend[] = ['darts', 'clone'];

describe.each(BACKENDS)('long keys (%s)', (backend) => {
  it('builds, saves, reloads and searches a 1,000,000-character key', () => {
    const long = 'a'.repeat(1_000_000);
    const branch = `${'a'.repeat(500_000)}c`;
    const entries: [string, number][] = [
      [long, 1],
      [branch, 3],
      ['b', 2],
    ];
    using dict = Dictionary.build(entries, { backend });
    expect(dict.backend).toBe(backend);
    expect(dict.exactMatchSearch(long)).toBe(1);
    expect(dict.exactMatchSearch(branch)).toBe(3);
    expect(dict.exactMatchSearch('a'.repeat(999_999))).toBeUndefined();
    expect(dict.commonPrefixSearch(`${long}zz`)).toEqual([{ value: 1, length: long.length }]);
    expect(dict.replaceWords(`x${long}y`, () => '#')).toBe('x#y');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-darts-long-'));
    try {
      const file = path.join(dir, 'long.darts');
      dict.saveSync(file);
      using reloaded = Dictionary.loadSync(file, { backend });
      expect(reloaded.exactMatchSearch(long)).toBe(1);
      expect(reloaded.exactMatchSearch(branch)).toBe(3);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

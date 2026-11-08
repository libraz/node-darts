/**
 * Build-input contract shared by both backends: omitted values are the key's
 * position in the caller's array, values must be non-negative 32-bit integers,
 * and keys must not contain NUL. Violations raise the same BuildError on
 * either backend instead of being truncated or wrapped differently.
 */

import { describe, expect, it } from 'vitest';
import type { Backend } from '../../../src';
import { BuildError, buildDictionary } from '../../../src';
import { dartsNative } from '../../../src/core/native';

const BACKENDS: Backend[] = ['darts', 'clone'];

describe.each(BACKENDS)('build input contract (%s)', (backend) => {
  it('assigns each key its index in the caller array when values are omitted', () => {
    const dict = buildDictionary(['cherry', 'apple', 'banana'], undefined, { backend });
    expect(dict.exactMatchSearch('cherry')).toBe(0);
    expect(dict.exactMatchSearch('apple')).toBe(1);
    expect(dict.exactMatchSearch('banana')).toBe(2);
    dict.dispose();
  });

  it('keeps the first index for a duplicated key when values are omitted', () => {
    const dict = buildDictionary(['b', 'a', 'b'], undefined, { backend });
    expect(dict.exactMatchSearch('b')).toBe(0);
    expect(dict.exactMatchSearch('a')).toBe(1);
    dict.dispose();
  });

  it('accepts the full non-negative int32 range', () => {
    const dict = buildDictionary(['a', 'b'], [0, 2147483647], { backend });
    expect(dict.exactMatchSearch('a')).toBe(0);
    expect(dict.exactMatchSearch('b')).toBe(2147483647);
    dict.dispose();
  });

  it.each([
    ['negative', -1],
    ['fractional', 1.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['above int32', 2147483648],
  ])('rejects a %s value with a uniform BuildError', (_label, value) => {
    expect(() => buildDictionary(['a', 'b'], [1, value], { backend })).toThrow(BuildError);
    expect(() => buildDictionary(['a', 'b'], [1, value], { backend })).toThrow(
      /values must be non-negative 32-bit integers/
    );
  });

  it('rejects keys containing NUL instead of truncating them', () => {
    expect(() => buildDictionary(['a\0b', 'c'], undefined, { backend })).toThrow(BuildError);
    expect(() => buildDictionary(['a\0b', 'c'], undefined, { backend })).toThrow(
      /keys must not contain NUL/
    );
  });

  it('applies the same checks through the exported native wrapper', () => {
    expect(() => dartsNative.build(['a'], [-3], backend)).toThrow(BuildError);
    expect(() => dartsNative.build(['x\0'], undefined, backend)).toThrow(BuildError);
  });
});

/**
 * commonPrefixSearch ordering and traverse semantics, identical on both backends:
 * traverse reports one step per consumed UTF-8 byte, `key` is the byte offset
 * after the step, and a terminal mismatch is reported with value -2.
 */

import { describe, expect, it } from 'vitest';
import type { Backend, TraverseResult } from '../../src';
import { buildDictionary, DartsError } from '../../src';

const BACKENDS: Backend[] = ['darts', 'clone'];

function collect(
  dict: ReturnType<typeof buildDictionary>,
  key: string,
  stopAfter = Number.POSITIVE_INFINITY
): Pick<TraverseResult, 'key' | 'value'>[] {
  const steps: Pick<TraverseResult, 'key' | 'value'>[] = [];
  dict.traverse(key, (r) => {
    steps.push({ key: r.key, value: r.value });
    return steps.length < stopAfter;
  });
  return steps;
}

describe.each(BACKENDS)('commonPrefixSearch (%s)', (backend) => {
  it('returns shorter prefixes first regardless of value order', () => {
    const dict = buildDictionary(['abc', 'a', 'ab'], [1, 30, 20], { backend });
    expect(dict.commonPrefixSearch('abcd')).toEqual([30, 20, 1]);
    dict.dispose();
  });

  it('returns only keys that are prefixes of the query', () => {
    const dict = buildDictionary(['ab', 'abc', 'abd', 'b'], [1, 2, 3, 4], { backend });
    expect(dict.commonPrefixSearch('abx')).toEqual([1]);
    expect(dict.commonPrefixSearch('ax')).toEqual([]);
    expect(dict.commonPrefixSearch('ab')).toEqual([1]);
    expect(dict.commonPrefixSearch('abd!')).toEqual([1, 3]);
    dict.dispose();
  });

  it('returns an empty array for a query shorter than every key', () => {
    const dict = buildDictionary(['abc'], [1], { backend });
    expect(dict.commonPrefixSearch('ab')).toEqual([]);
    dict.dispose();
  });

  it('orders multibyte prefixes by byte length', () => {
    const dict = buildDictionary(['日', '日本', '日本語'], [3, 2, 1], { backend });
    expect(dict.commonPrefixSearch('日本語です')).toEqual([3, 2, 1]);
    dict.dispose();
  });

  it('matches surrogate-pair keys as whole code points', () => {
    const dict = buildDictionary(['😀', '😀😀'], [7, 8], { backend });
    expect(dict.commonPrefixSearch('😀😀😀')).toEqual([7, 8]);
    expect(dict.commonPrefixSearch('😁')).toEqual([]);
    dict.dispose();
  });
});

describe.each(BACKENDS)('traverse (%s)', (backend) => {
  it('reports -1 for inner nodes and the value at a terminal key', () => {
    const dict = buildDictionary(['abc'], [42], { backend });
    expect(collect(dict, 'abc')).toEqual([
      { key: 1, value: -1 },
      { key: 2, value: -1 },
      { key: 3, value: 42 },
    ]);
    dict.dispose();
  });

  it('reports values at intermediate keys along the path', () => {
    const dict = buildDictionary(['a', 'ab', 'abc'], [1, 2, 3], { backend });
    expect(collect(dict, 'abc')).toEqual([
      { key: 1, value: 1 },
      { key: 2, value: 2 },
      { key: 3, value: 3 },
    ]);
    dict.dispose();
  });

  it('uses UTF-8 byte offsets for key positions', () => {
    const dict = buildDictionary(['あい'], [5], { backend });
    const steps = collect(dict, 'あい');
    expect(steps.map((s) => s.key)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(steps.map((s) => s.value)).toEqual([-1, -1, -1, -1, -1, 5]);
    dict.dispose();
  });

  it('counts a surrogate pair as four bytes', () => {
    const dict = buildDictionary(['😀'], [9], { backend });
    const steps = collect(dict, '😀');
    expect(steps.map((s) => s.key)).toEqual([1, 2, 3, 4]);
    expect(steps[3].value).toBe(9);
    dict.dispose();
  });

  it('ends with a -2 step at the failing byte offset when the key leaves the trie', () => {
    const dict = buildDictionary(['abc', 'abd'], [1, 2], { backend });
    const steps = collect(dict, 'abz');
    expect(steps).toEqual([
      { key: 1, value: -1 },
      { key: 2, value: -1 },
      { key: 2, value: -2 },
    ]);
    dict.dispose();
  });

  it('reports a single -2 step at offset 0 when the first byte is absent', () => {
    const dict = buildDictionary(['abc'], [1], { backend });
    expect(collect(dict, 'zzz')).toEqual([{ key: 0, value: -2 }]);
    dict.dispose();
  });

  it('reports no steps for an empty key', () => {
    const dict = buildDictionary(['abc'], [1], { backend });
    expect(collect(dict, '')).toEqual([]);
    dict.dispose();
  });

  it('stops as soon as the callback returns false', () => {
    const dict = buildDictionary(['abc'], [1], { backend });
    expect(collect(dict, 'abc', 2)).toEqual([
      { key: 1, value: -1 },
      { key: 2, value: -1 },
    ]);
    dict.dispose();
  });

  it('continues when the callback returns undefined', () => {
    const dict = buildDictionary(['abc'], [1], { backend });
    let calls = 0;
    dict.traverse('abc', () => {
      calls += 1;
      return undefined;
    });
    expect(calls).toBe(3);
    dict.dispose();
  });

  it('surfaces a throwing callback as a DartsError carrying the cause message', () => {
    const dict = buildDictionary(['abc'], [1], { backend });
    let calls = 0;
    const run = () =>
      dict.traverse('abc', () => {
        calls += 1;
        throw new Error('boom');
      });
    expect(run).toThrow(DartsError);
    expect(run).toThrow(/boom/);
    expect(calls).toBe(2);
    dict.dispose();
  });

  it('stays usable after a callback threw', () => {
    const dict = buildDictionary(['abc'], [1], { backend });
    expect(() =>
      dict.traverse('abc', () => {
        throw new Error('x');
      })
    ).toThrow(DartsError);
    expect(dict.exactMatchSearch('abc')).toBe(1);
    expect(collect(dict, 'abc')).toHaveLength(3);
    dict.dispose();
  });
});

/**
 * Search semantics shared by both backends: prefix ordering, trie walking
 * and result counts that the single-case tests in tests/api do not stress.
 */

import { describe, expect, it } from 'vitest';
import { type Backend, Dictionary } from '../../src';

const BACKENDS: Backend[] = ['darts', 'clone'];

describe.each(BACKENDS)('commonPrefixSearch (%s)', (backend) => {
  const build = (input: Parameters<typeof Dictionary.build>[0]) =>
    Dictionary.build(input, { backend });

  it('returns shorter prefixes first regardless of value order', () => {
    using dict = build([
      ['abc', 1],
      ['a', 30],
      ['ab', 20],
    ]);
    expect(dict.commonPrefixSearch('abcd')).toEqual([
      { value: 30, length: 1 },
      { value: 20, length: 2 },
      { value: 1, length: 3 },
    ]);
  });

  it('returns only keys that are prefixes of the text', () => {
    using dict = build(['ab', 'abc', 'abd', 'b']);
    const values = (text: string) => dict.commonPrefixSearch(text).map((m) => m.value);
    expect(values('abx')).toEqual([0]);
    expect(values('ax')).toEqual([]);
    expect(values('ab')).toEqual([0]);
    expect(values('abd!')).toEqual([0, 2]);
  });

  it('returns [] for text shorter than every key', () => {
    using dict = build(['abc']);
    expect(dict.commonPrefixSearch('ab')).toEqual([]);
  });

  it('measures multibyte prefixes in UTF-16 units', () => {
    using dict = build([
      ['日', 3],
      ['日本', 2],
      ['日本語', 1],
    ]);
    expect(dict.commonPrefixSearch('日本語です')).toEqual([
      { value: 3, length: 1 },
      { value: 2, length: 2 },
      { value: 1, length: 3 },
    ]);
  });

  it('matches astral keys as whole code points', () => {
    using dict = build([
      ['😀', 7],
      ['😀😀', 8],
    ]);
    expect(dict.commonPrefixSearch('😀😀😀')).toEqual([
      { value: 7, length: 2 },
      { value: 8, length: 4 },
    ]);
    expect(dict.commonPrefixSearch('😁')).toEqual([]);
  });

  it('never truncates the result list', () => {
    const total = 150;
    const keys = Array.from({ length: total }, (_v, i) => 'a'.repeat(i + 1));
    using dict = build(keys);
    const matches = dict.commonPrefixSearch('a'.repeat(total));
    expect(matches).toHaveLength(total);
    expect(matches.map((m) => m.length)).toEqual(keys.map((k) => k.length));
    expect(matches.map((m) => m.value)).toEqual(keys.map((_k, i) => i));
  });

  it('agrees with exactMatchSearch on every reported prefix', () => {
    const keys = ['a', 'ap', 'app', 'apple', 'application', 'b', 'ba', 'ban', 'banana'];
    using dict = build(keys);
    for (const text of ['apple', 'applications', 'banana split', 'zzz']) {
      for (const { value, length } of dict.commonPrefixSearch(text)) {
        expect(dict.exactMatchSearch(text.slice(0, length))).toBe(value);
      }
    }
  });
});

describe.each(BACKENDS)('traverse (%s)', (backend) => {
  it('reports undefined on inner nodes and the value at a terminal key', () => {
    using dict = Dictionary.build([['abc', 42]], { backend });
    expect(dict.traverse('abc')).toEqual([
      { length: 1, value: undefined },
      { length: 2, value: undefined },
      { length: 3, value: 42 },
    ]);
  });

  it('reports values at intermediate keys along the path', () => {
    using dict = Dictionary.build(['a', 'ab', 'abc'], { backend });
    expect(dict.traverse('abc')).toEqual([
      { length: 1, value: 0 },
      { length: 2, value: 1 },
      { length: 3, value: 2 },
    ]);
  });

  it('counts length in UTF-16 units, one step per character', () => {
    using dict = Dictionary.build([['あい😀', 5]], { backend });
    expect(dict.traverse('あい😀')).toEqual([
      { length: 1, value: undefined },
      { length: 2, value: undefined },
      { length: 4, value: 5 },
    ]);
  });

  it('leaves out the character that falls off the trie', () => {
    using dict = Dictionary.build(['abc', 'abd'], { backend });
    expect(dict.traverse('abz')).toEqual([
      { length: 1, value: undefined },
      { length: 2, value: undefined },
    ]);
  });

  it('returns [] when the first character is absent', () => {
    using dict = Dictionary.build(['abc'], { backend });
    expect(dict.traverse('zzz')).toEqual([]);
  });

  it('stops at the end of the text inside a longer key', () => {
    using dict = Dictionary.build([['abcdef', 1]], { backend });
    expect(dict.traverse('abc')).toHaveLength(3);
  });

  it('stays consistent with commonPrefixSearch', () => {
    using dict = Dictionary.build(['a', 'ab', 'abc', 'abd', 'b'], { backend });
    const text = 'abcd';
    const withValue = dict
      .traverse(text)
      .filter((s) => s.value !== undefined)
      .map((s) => ({ value: s.value, length: s.length }));
    expect(withValue).toEqual(dict.commonPrefixSearch(text));
  });
});

describe.each(BACKENDS)('keys and sizes (%s)', (backend) => {
  it('stores Unicode keys', () => {
    using dict = Dictionary.build(
      [
        ['こんにちは', 100],
        ['世界', 200],
        ['日本語', 300],
        ['こんばんは', 400],
      ],
      { backend }
    );
    expect(dict.exactMatchSearch('こんにちは')).toBe(100);
    expect(dict.exactMatchSearch('世界')).toBe(200);
    expect(dict.exactMatchSearch('日本語')).toBe(300);
    expect(dict.exactMatchSearch('こんばんは')).toBe(400);
    expect(dict.commonPrefixSearch('こんにちは世界')).toEqual([{ value: 100, length: 5 }]);
  });

  it('stores keys with regular-expression metacharacters literally', () => {
    using dict = Dictionary.build(['a+b', 'a*b', 'a?b', 'a.b'], { backend });
    expect(['a+b', 'a*b', 'a?b', 'a.b'].map((k) => dict.exactMatchSearch(k))).toEqual([0, 1, 2, 3]);
    expect(dict.exactMatchSearch('aab')).toBeUndefined();
  });

  it('finds every key of a 1000-key dictionary', () => {
    const keys = Array.from({ length: 1000 }, (_v, i) => `key${String(i).padStart(4, '0')}`);
    using dict = Dictionary.build(keys, { backend });
    for (let i = 0; i < keys.length; i += 1) {
      expect(dict.exactMatchSearch(keys[i])).toBe(i);
    }
    expect(dict.exactMatchSearch('key1000')).toBeUndefined();
  });
});

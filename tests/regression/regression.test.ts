/**
 * Regression tests for behaviour that was previously broken.
 *
 *  - traverse: one step per character, not one call for the whole key
 *  - commonPrefixSearch: no silent truncation of long result lists
 *  - build: sort and dedup keep keys and values aligned
 *  - replaceWords: an empty replacement is honoured
 *  - build is synchronous and takes no progress hook
 */

import { describe, expect, it } from 'vitest';
import { type BuildOptions, Dictionary } from '../../src';

describe('Regression: traverse per-character iteration', () => {
  it('returns one step per character with increasing lengths', () => {
    using dict = Dictionary.build([
      ['a', 10],
      ['ab', 20],
      ['abc', 30],
    ]);
    const steps = dict.traverse('abc');
    expect(steps.map((s) => s.length)).toEqual([1, 2, 3]);
    expect(steps.map((s) => s.value)).toEqual([10, 20, 30]);
  });

  it('stops where the path leaves the trie', () => {
    using dict = Dictionary.build([['apple', 42]]);
    expect(dict.traverse('apricot')).toEqual([
      { length: 1, value: undefined },
      { length: 2, value: undefined },
    ]);
  });
});

describe('Regression: commonPrefixSearch never truncates results', () => {
  it('returns more than 100 matches when the dictionary has them', () => {
    const total = 150;
    const keys = Array.from({ length: total }, (_v, i) => 'a'.repeat(i + 1));
    using dict = Dictionary.build(keys);
    expect(dict.commonPrefixSearch('a'.repeat(total))).toHaveLength(total);
    for (const key of keys) {
      expect(dict.exactMatchSearch(key)).toBeDefined();
    }
  });

  it('handles empty text without crashing', () => {
    using dict = Dictionary.build(['apple']);
    expect(dict.commonPrefixSearch('')).toEqual([]);
  });
});

describe('Regression: build keeps keys and values aligned through sort and dedup', () => {
  it('preserves the per-key value when the input is unsorted', () => {
    using dict = Dictionary.build([
      ['orange', 300],
      ['apple', 100],
      ['banana', 200],
    ]);
    expect(dict.exactMatchSearch('apple')).toBe(100);
    expect(dict.exactMatchSearch('banana')).toBe(200);
    expect(dict.exactMatchSearch('orange')).toBe(300);
  });

  it('keeps the first value of a duplicate key and every later key aligned', () => {
    using dict = Dictionary.build([
      ['apple', 10],
      ['banana', 20],
      ['apple', 999],
      ['cherry', 30],
    ]);
    expect(dict.exactMatchSearch('apple')).toBe(10);
    expect(dict.exactMatchSearch('banana')).toBe(20);
    expect(dict.exactMatchSearch('cherry')).toBe(30);
  });
});

describe('Regression: replaceWords honours empty replacements', () => {
  it('replaces a matched word with the empty string when the map provides one', () => {
    using dict = Dictionary.build(['apple', 'banana']);
    expect(dict.replaceWords('I like apple and banana', { apple: '', banana: 'B' })).toBe(
      'I like  and B'
    );
  });
});

describe('Regression: build is synchronous and ignores unknown options', () => {
  it('returns a usable dictionary directly and ignores a legacy progressCallback', () => {
    let called = false;
    const options = {
      progressCallback: () => {
        called = true;
      },
    } as BuildOptions;
    using dict = Dictionary.build(['apple', 'banana', 'orange'], options);
    expect(dict.exactMatchSearch('banana')).toBe(1);
    expect(called).toBe(false);
  });
});

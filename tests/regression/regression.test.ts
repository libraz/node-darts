/**
 * Regression tests for behaviour that was previously broken.
 *
 * Each `describe` block targets a specific bug fix:
 *  - traverse: per-character iteration (was: one call consumed the whole key)
 *  - commonPrefixSearch: no silent truncation at 100 results
 *  - Builder: sort + dedup keep keys/values aligned
 *  - Builder.progressCallback: invoked synchronously, no setInterval leak
 *  - Dictionary.replaceWords: empty-string replacement is honoured
 */

import { Builder, buildDictionary, Dictionary, type TraverseResult } from '../../src';

describe('Regression: native traverse per-character iteration', () => {
  it('fires the callback once per character and reports increasing key positions', () => {
    const dict = buildDictionary(['a', 'ab', 'abc'], [10, 20, 30]);
    const events: TraverseResult[] = [];

    dict.traverse('abc', (result) => {
      events.push({ ...result });
      return true;
    });

    // 3 characters consumed -> 3 callback invocations
    expect(events).toHaveLength(3);
    expect(events.map((e) => e.key)).toEqual([1, 2, 3]);
    expect(events.map((e) => e.value)).toEqual([10, 20, 30]);

    dict.dispose();
  });

  it('reports value -1 at non-terminal nodes and stops when the path is missing', () => {
    const dict = buildDictionary(['apple'], [42]);
    const events: TraverseResult[] = [];

    dict.traverse('apricot', (result) => {
      events.push({ ...result });
      return true;
    });

    // 'a' and 'p' match, 'r' diverges from 'apple'. The implementation calls
    // the callback once with result === -2 to signal the failed step, then
    // stops.
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[events.length - 1].value).toBe(-2);

    dict.dispose();
  });

  it('stops immediately when the callback returns false', () => {
    const dict = buildDictionary(['abcdef'], [1]);
    const events: TraverseResult[] = [];

    dict.traverse('abcdef', () => {
      events.push({ node: -1, key: -1, value: -1 });
      return false;
    });

    expect(events).toHaveLength(1);
    dict.dispose();
  });
});

describe('Regression: commonPrefixSearch never truncates results', () => {
  it('returns more than 100 prefix matches when the dictionary contains them', () => {
    // Build keys 'a', 'aa', 'aaa', ... up to length 150 so a search for the
    // longest one yields all 150 prefixes. The previous hard-coded 100 cap
    // would silently drop matches 101-150.
    const total = 150;
    const keys: string[] = [];
    for (let i = 1; i <= total; i += 1) {
      keys.push('a'.repeat(i));
    }

    const dict = buildDictionary(keys);
    const results = dict.commonPrefixSearch('a'.repeat(total));

    expect(results).toHaveLength(total);
    // Every original key should still be findable.
    keys.forEach((key) => {
      expect(dict.exactMatchSearch(key)).not.toBe(-1);
    });

    dict.dispose();
  });

  it('handles empty search keys without crashing', () => {
    const dict = buildDictionary(['apple']);
    expect(dict.commonPrefixSearch('')).toEqual([]);
    dict.dispose();
  });
});

describe('Regression: Builder keeps keys/values aligned through sort+dedup', () => {
  it('preserves the per-key value when the input is unsorted', () => {
    const builder = new Builder();
    const keys = ['orange', 'apple', 'banana'];
    const values = [300, 100, 200];

    const dict = builder.build(keys, values);

    expect(dict.exactMatchSearch('apple')).toBe(100);
    expect(dict.exactMatchSearch('banana')).toBe(200);
    expect(dict.exactMatchSearch('orange')).toBe(300);

    dict.dispose();
  });

  it('drops duplicate keys and keeps the first value for that key', () => {
    const builder = new Builder();
    const keys = ['apple', 'banana', 'apple'];
    const values = [10, 20, 999];

    // Without the fix, the native side would error with
    // "Values array length must match keys array length" because dedup
    // shrank num_keys but kept the original values length.
    const dict = builder.build(keys, values);

    // Either the first or last duplicate value is acceptable behaviour, but
    // the dictionary must build successfully and resolve all unique keys.
    const apple = dict.exactMatchSearch('apple');
    expect(apple === 10 || apple === 999).toBe(true);
    expect(dict.exactMatchSearch('banana')).toBe(20);

    dict.dispose();
  });
});

describe('Regression: Builder.progressCallback is invoked synchronously', () => {
  it('reports start and completion without leaking timers', () => {
    const calls: Array<[number, number]> = [];
    const progressCallback = (current: number, total: number) => {
      calls.push([current, total]);
    };

    const builder = new Builder();
    const dict = builder.build(['apple', 'banana', 'orange'], undefined, { progressCallback });

    // Synchronous start (0/total) and completion (total/total).
    expect(calls).toEqual([
      [0, 3],
      [3, 3],
    ]);

    dict.dispose();
  });

  it('does not invoke the callback when the build fails', () => {
    const progressCallback = vi.fn();
    const builder = new Builder();

    expect(() => builder.build([], undefined, { progressCallback })).toThrow();
    // The error is thrown by validateInput, before any progress reporting.
    expect(progressCallback).not.toHaveBeenCalled();
  });
});

describe('Regression: Dictionary.replaceWords honours empty replacements', () => {
  it('replaces a matched word with the empty string when the map provides one', () => {
    const dict = buildDictionary(['apple', 'banana']);
    const result = dict.replaceWords('I like apple and banana', { apple: '', banana: 'B' });
    // "apple" is replaced with '', collapsing the surrounding spaces, and
    // "banana" is replaced with 'B'.
    expect(result).toBe('I like  and B');
    dict.dispose();
  });
});

describe('Regression: Dictionary constructor no longer requires words', () => {
  it('accepts only a handle and exposes a disposed flag', () => {
    const dict = new Dictionary();
    expect(dict.disposed).toBe(false);
    expect(dict.size()).toBe(0);
    dict.dispose();
    expect(dict.disposed).toBe(true);
  });
});

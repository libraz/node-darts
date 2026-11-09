/**
 * Lightweight perf smoke tests.
 *
 * Small inputs and very generous time budgets: not microbenchmarks, they only
 * catch order-of-magnitude regressions (an O(n) operation turning O(n^2)).
 * If a budget flakes on a slow runner, raise the budget rather than chasing
 * the flake.
 */

import { describe, expect, it } from 'vitest';
import { Dictionary } from '../../src';

const KEYS = 2000;
const SEARCHES = 1000;

const entries = (): [string, number][] =>
  Array.from({ length: KEYS }, (_v, i) => [`key${String(i).padStart(5, '0')}`, i]);

describe('Performance smoke', () => {
  it(`builds a ${KEYS}-key dictionary in well under a second`, () => {
    const input = entries();
    const start = Date.now();
    using dict = Dictionary.build(input);
    const elapsed = Date.now() - start;

    expect(dict.byteLength).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1000);
  });

  it(`runs ${SEARCHES} exact-match searches against ${KEYS} keys in well under a second`, () => {
    using dict = Dictionary.build(entries());

    const start = Date.now();
    for (let i = 0; i < SEARCHES; i += 1) {
      const index = i % KEYS;
      const result = dict.exactMatchSearch(`key${String(index).padStart(5, '0')}`);
      if (result !== index) throw new Error(`expected ${index}, got ${result}`);
    }
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it('replaces words in moderate text without quadratic blowup', () => {
    const words = Array.from({ length: 200 }, (_v, i) => `word${String(i).padStart(3, '0')}`);
    using dict = Dictionary.build(words);

    let text = '';
    for (let i = 0; i < 1000; i += 1) {
      text += i % 5 === 0 ? `${words[i % words.length]} ` : `random${i} `;
    }

    const start = Date.now();
    const result = dict.replaceWords(text, (match) => `<<${match}>>`);
    const elapsed = Date.now() - start;

    expect(result.length).toBe(text.length + 200 * 4);
    expect(elapsed).toBeLessThan(1000);
  });
});

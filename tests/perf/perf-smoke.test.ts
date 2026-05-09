/**
 * Lightweight perf smoke tests.
 *
 * The full perf suite (performance.test.ts) is `describe.skip`-ed because it
 * generates 10k-100k keys and is too slow for CI. These smoke tests use small
 * inputs and very generous time budgets — they are not microbenchmarks, they
 * just catch order-of-magnitude regressions (e.g. an O(n) op going O(n²)).
 *
 * If a budget here ever flakes on a slower CI runner, raise the budget rather
 * than chasing the flake; the goal is *coarse* regression detection.
 */

import { Builder, buildDictionary, TextDarts } from '../../src';

const KEYS = 2000;
const SEARCHES = 1000;

function generateKeys(): { keys: string[]; values: number[] } {
  const keys: string[] = [];
  const values: number[] = [];
  for (let i = 0; i < KEYS; i += 1) {
    keys.push(`key${i.toString().padStart(5, '0')}`);
    values.push(i);
  }
  return { keys, values };
}

describe('Performance smoke', () => {
  it(`builds a ${KEYS}-key dictionary in well under a second`, () => {
    const { keys, values } = generateKeys();
    const builder = new Builder();

    const start = Date.now();
    const dict = builder.build(keys, values);
    const elapsed = Date.now() - start;

    expect(dict.size()).toBeGreaterThan(0);
    // Generous bound: build of 2k keys is normally a few ms; flag anything
    // over a second as a serious regression.
    expect(elapsed).toBeLessThan(1000);

    dict.dispose();
  });

  it(`runs ${SEARCHES} exact-match searches against ${KEYS} keys in well under a second`, () => {
    const { keys, values } = generateKeys();
    const dict = buildDictionary(keys, values);

    const start = Date.now();
    for (let i = 0; i < SEARCHES; i += 1) {
      const index = i % KEYS;
      const key = `key${index.toString().padStart(5, '0')}`;
      const result = dict.exactMatchSearch(key);
      // Force the result to be observed so the loop can't be DCE'd by V8.
      if (result !== index) {
        throw new Error(`expected ${index} for ${key}, got ${result}`);
      }
    }
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(1000);

    dict.dispose();
  });

  it('replaces words in moderate text without quadratic blowup', () => {
    const words: string[] = [];
    for (let i = 0; i < 200; i += 1) {
      words.push(`word${i.toString().padStart(3, '0')}`);
    }
    const td = TextDarts.build(words);

    let text = '';
    for (let i = 0; i < 1000; i += 1) {
      if (i % 5 === 0) {
        text += `${words[i % words.length]} `;
      } else {
        text += `random${i} `;
      }
    }

    const start = Date.now();
    const result = td.replaceWords(text, (match) => `<<${match}>>`);
    const elapsed = Date.now() - start;

    expect(result.length).toBeGreaterThan(text.length); // every match grows the text
    expect(elapsed).toBeLessThan(1000);

    td.dispose();
  });
});

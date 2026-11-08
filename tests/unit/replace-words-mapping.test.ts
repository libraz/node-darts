/**
 * replaceWords with a mapping object consults only the object's own keys:
 * a matched word that names an inherited Object.prototype member is left
 * unchanged rather than replaced with that member.
 */

import { describe, expect, it } from 'vitest';
import { buildDictionary, TextDarts } from '../../src';

const WORDS = ['apple', 'toString', 'constructor', '__proto__', 'hasOwnProperty'];

describe('replaceWords mapping object', () => {
  it('leaves words that only exist on Object.prototype unchanged', () => {
    const dict = buildDictionary(WORDS);
    const text = 'apple toString constructor __proto__ hasOwnProperty';
    expect(dict.replaceWords(text, { apple: 'APPLE' })).toBe(
      'APPLE toString constructor __proto__ hasOwnProperty'
    );
    dict.dispose();
  });

  it('still uses an own property that shadows a prototype name', () => {
    const dict = buildDictionary(WORDS);
    expect(dict.replaceWords('toString', { toString: 'TS' } as Record<string, string>)).toBe('TS');
    dict.dispose();
  });

  it('behaves the same through TextDarts', () => {
    const darts = TextDarts.build(WORDS);
    expect(darts.replaceWords('constructor apple', { apple: 'A' })).toBe('constructor A');
    darts.dispose();
  });
});

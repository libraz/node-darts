/**
 * replaceWords matching behaviour: longest match, adjacency, multibyte and
 * surrogate-pair text, replacer arguments and pass-through of unmatched text.
 */

import { describe, expect, it } from 'vitest';
import { type Backend, Dictionary } from '../../src';

const BACKENDS: Backend[] = ['darts', 'clone'];

describe.each(BACKENDS)('replaceWords (%s)', (backend) => {
  const build = (keys: string[]) => Dictionary.build(keys, { backend });

  it('wraps every dictionary word in a sentence', () => {
    using dict = build(['apple', 'banana', 'orange', 'pineapple']);
    expect(dict.replaceWords('I like apple and pineapple for breakfast.', (w) => `<<${w}>>`)).toBe(
      'I like <<apple>> and <<pineapple>> for breakfast.'
    );
  });

  it('passes the key value as the second argument', () => {
    using dict = Dictionary.build(
      [
        ['apple', 100],
        ['banana', 200],
      ],
      { backend }
    );
    expect(dict.replaceWords('apple banana', (w, v) => `${w}=${v}`)).toBe('apple=100 banana=200');
  });

  it('prefers the longest of several overlapping keys', () => {
    using dict = build(['a', 'ab', 'abc']);
    expect(dict.replaceWords('abcd', (w) => `[${w}]`)).toBe('[abc]d');
  });

  it('falls back to a shorter key when the longer one only partially matches', () => {
    using dict = build(['ab', 'abcd']);
    expect(dict.replaceWords('abce', (w) => `[${w}]`)).toBe('[ab]ce');
  });

  it('replaces adjacent matches without separators', () => {
    using dict = build(['ab', 'cd']);
    expect(dict.replaceWords('abcdab', (w) => `<${w}>`)).toBe('<ab><cd><ab>');
  });

  it('does not rescan replacement output', () => {
    using dict = build(['a']);
    expect(dict.replaceWords('aa', () => 'aaa')).toBe('aaaaaa');
  });

  it('handles Japanese text', () => {
    using dict = build(['東京', '東京都', '都']);
    expect(dict.replaceWords('東京都と京都', (w) => `<${w}>`)).toBe('<東京都>と京<都>');
  });

  it('keeps surrogate pairs intact for keys and for unmatched text', () => {
    using dict = build(['😀', '😀😀']);
    expect(dict.replaceWords('a😀😀😀b😁', (w) => `[${w}]`)).toBe('a[😀😀][😀]b😁');
  });

  it('passes unmatched surrogate pairs through unchanged', () => {
    using dict = build(['x']);
    expect(dict.replaceWords('😀x😁', () => 'Y')).toBe('😀Y😁');
  });

  it('hands the replacer the exact matched substring, once per match', () => {
    using dict = build(['cat', 'cats', 'dog']);
    const seen: string[] = [];
    dict.replaceWords('cats dog cat', (w) => {
      seen.push(w);
      return w;
    });
    expect(seen).toEqual(['cats', 'dog', 'cat']);
  });

  it('returns an empty string for empty text', () => {
    using dict = build(['a']);
    expect(dict.replaceWords('', () => 'X')).toBe('');
  });

  it('returns text without matches unchanged and never calls the replacer', () => {
    using dict = build(['apple']);
    let calls = 0;
    const text = 'nothing here 日本語 😀';
    expect(
      dict.replaceWords(text, (w) => {
        calls += 1;
        return w;
      })
    ).toBe(text);
    expect(calls).toBe(0);
  });

  it('replaces a match that is the whole text', () => {
    using dict = build(['whole']);
    expect(dict.replaceWords('whole', () => 'part')).toBe('part');
  });

  it('replaces with the empty string when the replacer says so', () => {
    using dict = build(['apple', 'banana']);
    expect(dict.replaceWords('I like apple and banana', { apple: '', banana: 'B' })).toBe(
      'I like  and B'
    );
    expect(dict.replaceWords('apple!', () => '')).toBe('!');
  });
});

describe.each(BACKENDS)('replaceWords with a mapping (%s)', (backend) => {
  const WORDS = ['apple', 'toString', 'constructor', '__proto__', 'hasOwnProperty'];

  it('selects the longest key before consulting the mapping', () => {
    using dict = Dictionary.build(['ab', 'a'], { backend });
    expect(dict.replaceWords('aab', { a: '1', ab: '2' })).toBe('12');
  });

  it('keeps the matched word when the mapping has no entry for it', () => {
    using dict = Dictionary.build(['ab', 'cd'], { backend });
    expect(dict.replaceWords('abcd', { ab: 'X' })).toBe('Xcd');
    expect(dict.replaceWords('abcd', new Map([['cd', 'Y']]))).toBe('abY');
  });

  it('leaves words that only exist on Object.prototype unchanged', () => {
    using dict = Dictionary.build(WORDS, { backend });
    const text = 'apple toString constructor __proto__ hasOwnProperty';
    expect(dict.replaceWords(text, { apple: 'APPLE' })).toBe(
      'APPLE toString constructor __proto__ hasOwnProperty'
    );
  });

  it('still uses an own property that shadows a prototype name', () => {
    using dict = Dictionary.build(WORDS, { backend });
    expect(dict.replaceWords('toString', { toString: 'TS' })).toBe('TS');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { Dictionary } from '../../src';
import { dartsImage } from './helpers';

const open: Dictionary[] = [];
function build(...args: Parameters<typeof Dictionary.build>): Dictionary {
  const dict = Dictionary.build(...args);
  open.push(dict);
  return dict;
}
afterEach(() => {
  for (const d of open.splice(0)) d.dispose();
});

/**
 * A Darts image no UTF-8 build can produce: key [0xC3] (half of a two-byte
 * character) with value 7, and key "a" with value 3.
 */
function nonUtf8Dictionary(): Dictionary {
  const image = dartsImage([
    [0, 1, 0],
    [99, 100, 1],
    [100, -4, 100],
    [197, 198, 1],
    [198, -8, 198],
  ]);
  const dict = Dictionary.fromBytes(image, { backend: 'darts' });
  open.push(dict);
  return dict;
}

describe('exactMatchSearch', () => {
  it('returns the value of an ASCII key and undefined on a miss', () => {
    const dict = build(['apple', 'app']);
    expect(dict.exactMatchSearch('apple')).toBe(0);
    expect(dict.exactMatchSearch('app')).toBe(1);
    expect(dict.exactMatchSearch('ap')).toBeUndefined();
    expect(dict.exactMatchSearch('cherry')).toBeUndefined();
  });

  it('finds Japanese and astral keys', () => {
    const dict = build(['東京', '😀', '𠮷野家']);
    expect(dict.exactMatchSearch('東京')).toBe(0);
    expect(dict.exactMatchSearch('😀')).toBe(1);
    expect(dict.exactMatchSearch('𠮷野家')).toBe(2);
    expect(dict.exactMatchSearch('\uD83D')).toBeUndefined();
  });

  it('stores a lone surrogate as U+FFFD', () => {
    const dict = build(['\uD800']);
    expect(dict.exactMatchSearch('\uFFFD')).toBe(0);
    expect(dict.exactMatchSearch('\uDFFF')).toBe(0);
  });

  it('finds the empty key only through exactMatchSearch (darts)', () => {
    const dict = build(
      [
        ['', 9],
        ['a', 1],
      ],
      { backend: 'darts' }
    );
    expect(dict.exactMatchSearch('')).toBe(9);
    expect(dict.commonPrefixSearch('ab')).toEqual([{ value: 1, length: 1 }]);
    expect(dict.traverse('ab')).toEqual([{ length: 1, value: 1 }]);
  });

  it('misses the empty key when none was stored', () => {
    expect(build(['a']).exactMatchSearch('')).toBeUndefined();
  });

  it('misses a key containing NUL', () => {
    const dict = build(['a']);
    expect(dict.exactMatchSearch('a\0')).toBeUndefined();
    expect(dict.exactMatchSearch('\0')).toBeUndefined();
  });

  it('misses a key that ends inside a character of a non-UTF-8 dictionary', () => {
    const dict = nonUtf8Dictionary();
    expect(dict.exactMatchSearch('a')).toBe(3);
    expect(dict.exactMatchSearch('Ã')).toBeUndefined();
  });
});

describe('commonPrefixSearch', () => {
  it('returns every prefix match shortest first with UTF-16 lengths', () => {
    const dict = build(
      new Map([
        ['東京都', 2],
        ['東京', 1],
      ])
    );
    expect(dict.commonPrefixSearch('東京都庁')).toEqual([
      { value: 1, length: 2 },
      { value: 2, length: 3 },
    ]);
    for (const { length, value } of dict.commonPrefixSearch('東京都庁')) {
      expect(dict.exactMatchSearch('東京都庁'.slice(0, length))).toBe(value);
    }
  });

  it('measures ASCII matches', () => {
    const dict = build(['a', 'ab', 'abc', 'b']);
    expect(dict.commonPrefixSearch('abcd')).toEqual([
      { value: 0, length: 1 },
      { value: 1, length: 2 },
      { value: 2, length: 3 },
    ]);
    expect(dict.commonPrefixSearch('xyz')).toEqual([]);
  });

  it('counts a surrogate pair as two units', () => {
    const dict = build(['😀', '😀a', '😀a😃']);
    expect(dict.commonPrefixSearch('😀a😃!')).toEqual([
      { value: 0, length: 2 },
      { value: 1, length: 3 },
      { value: 2, length: 5 },
    ]);
  });

  it('matches a lone surrogate in the text against a U+FFFD key', () => {
    const dict = build(['\uFFFD', '\uFFFDx']);
    expect(dict.commonPrefixSearch('\uDC00x')).toEqual([
      { value: 0, length: 1 },
      { value: 1, length: 2 },
    ]);
  });

  it('returns [] for empty text', () => {
    expect(build(['a']).commonPrefixSearch('')).toEqual([]);
  });

  it('stops at NUL', () => {
    const dict = build(['a', 'ab']);
    expect(dict.commonPrefixSearch('a\0b')).toEqual([{ value: 0, length: 1 }]);
  });

  it('drops matches that end inside a character', () => {
    const dict = nonUtf8Dictionary();
    expect(dict.commonPrefixSearch('Ã')).toEqual([]);
    expect(dict.commonPrefixSearch('ab')).toEqual([{ value: 3, length: 1 }]);
  });
});

describe('traverse', () => {
  it('reports one step per character until the text leaves the trie', () => {
    const dict = build(
      new Map([
        ['東京', 1],
        ['東京都', 2],
      ])
    );
    expect(dict.traverse('東京都庁')).toEqual([
      { length: 1, value: undefined },
      { length: 2, value: 1 },
      { length: 3, value: 2 },
    ]);
    expect(dict.traverse('東京タワー')).toEqual([
      { length: 1, value: undefined },
      { length: 2, value: 1 },
    ]);
  });

  it('walks ASCII text', () => {
    const dict = build(['abc']);
    expect(dict.traverse('abcd')).toEqual([
      { length: 1, value: undefined },
      { length: 2, value: undefined },
      { length: 3, value: 0 },
    ]);
    expect(dict.traverse('x')).toEqual([]);
  });

  it('steps over a surrogate pair as one character', () => {
    const dict = build(['😀x']);
    expect(dict.traverse('😀x')).toEqual([
      { length: 2, value: undefined },
      { length: 3, value: 0 },
    ]);
  });

  it('steps over a lone surrogate as U+FFFD', () => {
    const dict = build(['\uFFFDz']);
    expect(dict.traverse('\uD800z')).toEqual([
      { length: 1, value: undefined },
      { length: 2, value: 0 },
    ]);
  });

  it('omits a character that leaves the trie mid-character', () => {
    // U+00E9 is C3 A9 and U+00E8 is C3 A8: the first byte is in the trie.
    const dict = build(['é', 'aé']);
    expect(dict.traverse('è')).toEqual([]);
    expect(dict.traverse('aè')).toEqual([{ length: 1, value: undefined }]);
    expect(nonUtf8Dictionary().traverse('Ã')).toEqual([]);
  });

  it('returns [] for empty text', () => {
    expect(build(['a']).traverse('')).toEqual([]);
  });

  it('stops at NUL', () => {
    const dict = build(['ab']);
    expect(dict.traverse('a\0b')).toEqual([{ length: 1, value: undefined }]);
  });
});

describe('replaceWords', () => {
  it('replaces the longest match at each position, left to right', () => {
    const dict = build(['apple', 'app', 'pie']);
    expect(dict.replaceWords('apple pie and app', (m, v) => `<${m}:${v}>`)).toBe(
      '<apple:0> <pie:2> and <app:1>'
    );
  });

  it('passes the matched text and its value to a function replacer', () => {
    const dict = build([['東京', 13]]);
    const seen: Array<[string, number]> = [];
    const out = dict.replaceWords('東京へ行く', (m, v) => {
      seen.push([m, v]);
      return 'Tokyo';
    });
    expect(out).toBe('Tokyoへ行く');
    expect(seen).toEqual([['東京', 13]]);
  });

  it('takes a Map replacer and leaves keys it lacks', () => {
    const dict = build(['cat', 'dog']);
    expect(dict.replaceWords('cat and dog', new Map([['cat', 'neko']]))).toBe('neko and dog');
  });

  it('takes an object replacer and reads only its own properties', () => {
    const dict = build(['toString', 'cat']);
    expect(dict.replaceWords('cat toString', { cat: 'neko' })).toBe('neko toString');
  });

  it('rejects a non-string replacement from a function', () => {
    const dict = build(['cat']);
    expect(() => dict.replaceWords('cat', (() => 1) as unknown as () => string)).toThrow(TypeError);
  });

  it('does not split a surrogate pair', () => {
    const dict = build(['\uDE00', 'a']);
    expect(dict.replaceWords('😀a😀', () => 'X')).toBe('😀X😀');
  });

  it('replaces a lone surrogate in the text through a U+FFFD key', () => {
    const dict = build(['\uFFFD']);
    expect(dict.replaceWords('x\uD800y', (m) => `[${m === '\uD800'}]`)).toBe('x[true]y');
  });

  it('replaces keys longer than 50 characters', () => {
    const long = 'k'.repeat(51);
    const dict = build([long]);
    expect(dict.replaceWords(`<${long}>`, () => 'L')).toBe('<L>');
  });

  it('does not loop on an empty key (darts)', () => {
    const dict = build(['', 'b'], { backend: 'darts' });
    expect(dict.replaceWords('abc', () => 'B')).toBe('aBc');
  });

  it('drops matches that end inside a character', () => {
    const dict = nonUtf8Dictionary();
    expect(dict.replaceWords('Ãa', () => '#')).toBe('Ã#');
  });
});

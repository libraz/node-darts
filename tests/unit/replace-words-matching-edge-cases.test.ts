/**
 * replaceWords matching behaviour: longest match, adjacency, multibyte and
 * surrogate-pair text, replacer arguments and pass-through of unmatched text.
 */

import { describe, expect, it } from 'vitest';
import type { Backend } from '../../src';
import { BuildError, buildDictionary } from '../../src';

const BACKENDS: Backend[] = ['darts', 'clone'];

describe.each(BACKENDS)('replaceWords edge cases (%s)', (backend) => {
  const build = (keys: string[]) => buildDictionary(keys, undefined, { backend });

  it('prefers the longest of several overlapping keys', () => {
    const dict = build(['a', 'ab', 'abc']);
    expect(dict.replaceWords('abcd', (w) => `[${w}]`)).toBe('[abc]d');
    dict.dispose();
  });

  it('falls back to a shorter key when the longer one only partially matches', () => {
    const dict = build(['ab', 'abcd']);
    expect(dict.replaceWords('abce', (w) => `[${w}]`)).toBe('[ab]ce');
    dict.dispose();
  });

  it('replaces adjacent matches without separators', () => {
    const dict = build(['ab', 'cd']);
    expect(dict.replaceWords('abcdab', (w) => w.toUpperCase())).toBe('ABCDAB');
    expect(dict.replaceWords('abcdab', (w) => `<${w}>`)).toBe('<ab><cd><ab>');
    dict.dispose();
  });

  it('does not rescan replacement output', () => {
    const dict = build(['a']);
    expect(dict.replaceWords('aa', () => 'aaa')).toBe('aaaaaa');
    dict.dispose();
  });

  it('handles Japanese text', () => {
    const dict = build(['東京', '東京都', '都']);
    expect(dict.replaceWords('東京都と京都', (w) => `<${w}>`)).toBe('<東京都>と京<都>');
    dict.dispose();
  });

  it('keeps surrogate pairs intact for keys and for unmatched text', () => {
    const dict = build(['😀', '😀😀']);
    expect(dict.replaceWords('a😀😀😀b😁', (w) => `[${w}]`)).toBe('a[😀😀][😀]b😁');
    dict.dispose();
  });

  it('passes unmatched surrogate pairs through unchanged', () => {
    const dict = build(['x']);
    expect(dict.replaceWords('😀x😁', () => 'Y')).toBe('😀Y😁');
    dict.dispose();
  });

  it('hands the replacer the exact matched substring, once per match', () => {
    const dict = build(['cat', 'cats', 'dog']);
    const seen: string[] = [];
    dict.replaceWords('cats dog cat', (w) => {
      seen.push(w);
      return w;
    });
    expect(seen).toEqual(['cats', 'dog', 'cat']);
    dict.dispose();
  });

  it('supports an object mapping with longest-match selection', () => {
    const dict = build(['ab', 'a']);
    expect(dict.replaceWords('aab', { a: '1', ab: '2' })).toBe('12');
    dict.dispose();
  });

  it('keeps the matched word when a mapping has no entry for it', () => {
    const dict = build(['ab', 'cd']);
    expect(dict.replaceWords('abcd', { ab: 'X' })).toBe('Xcd');
    dict.dispose();
  });

  it('returns an empty string for empty text', () => {
    const dict = build(['a']);
    expect(dict.replaceWords('', () => 'X')).toBe('');
    dict.dispose();
  });

  it('returns text without matches unchanged and never calls the replacer', () => {
    const dict = build(['apple']);
    let calls = 0;
    const text = 'nothing here 日本語 😀';
    expect(
      dict.replaceWords(text, (w) => {
        calls += 1;
        return w;
      })
    ).toBe(text);
    expect(calls).toBe(0);
    dict.dispose();
  });

  it('cannot be built from an empty key list', () => {
    expect(() => build([])).toThrow(BuildError);
  });

  it('replaces a match that is the whole text', () => {
    const dict = build(['whole']);
    expect(dict.replaceWords('whole', () => 'part')).toBe('part');
    dict.dispose();
  });
});

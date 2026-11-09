import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type Backend,
  BuildError,
  DartsError,
  Dictionary,
  FileNotFoundError,
  InvalidDictionaryError,
} from '../../src';
import { makeTempDir } from './helpers';

// Boundary values of every public input: one describe per input class, one
// test per input column the class applies to.
const loose = Dictionary as any;

let tmp: ReturnType<typeof makeTempDir>;
const open: Dictionary[] = [];
beforeEach(() => {
  tmp = makeTempDir();
});
afterEach(() => {
  for (const d of open.splice(0)) d.dispose();
  tmp.cleanup();
});
function keep(dict: Dictionary): Dictionary {
  open.push(dict);
  return dict;
}

describe('0 / -0', () => {
  it('build value: 0 is accepted and -0 is stored as 0', () => {
    const dict = keep(
      Dictionary.build([
        ['zero', 0],
        ['negzero', -0],
      ])
    );
    expect(dict.exactMatchSearch('zero')).toBe(0);
    expect(Object.is(dict.exactMatchSearch('negzero'), 0)).toBe(true);
  });
});

describe('NaN / ±Inf', () => {
  it('build value: RangeError', () => {
    for (const v of [Number.NaN, Infinity, -Infinity]) {
      expect(() => Dictionary.build([['a', v]])).toThrow(RangeError);
    }
  });
});

describe('null / undefined / missing', () => {
  it('build input: undefined, null or missing → TypeError', () => {
    expect(() => loose.build()).toThrow(TypeError);
    expect(() => loose.build(undefined)).toThrow(TypeError);
    expect(() => loose.build(null)).toThrow(TypeError);
  });

  it('build element: null → TypeError', () => {
    expect(() => loose.build([null])).toThrow(TypeError);
    expect(() => loose.build(['a', null])).toThrow(TypeError);
  });

  it('build value: undefined or null → TypeError', () => {
    expect(() => loose.build([['a', undefined]])).toThrow(TypeError);
    expect(() => loose.build([['a', null]])).toThrow(TypeError);
  });

  it('search key / text: TypeError', () => {
    const d = keep(Dictionary.build(['a'])) as any;
    for (const bad of [null, undefined]) {
      expect(() => d.exactMatchSearch(bad)).toThrow(TypeError);
      expect(() => d.commonPrefixSearch(bad)).toThrow(TypeError);
      expect(() => d.traverse(bad)).toThrow(TypeError);
      expect(() => d.replaceWords(bad, {})).toThrow(TypeError);
    }
    expect(() => d.exactMatchSearch()).toThrow(TypeError);
  });

  it('path: TypeError, rejected by the async entry points', async () => {
    const d = keep(Dictionary.build(['a'])) as any;
    for (const bad of [null, undefined]) {
      expect(() => loose.loadSync(bad)).toThrow(TypeError);
      expect(() => d.saveSync(bad)).toThrow(TypeError);
      await expect(loose.load(bad)).rejects.toThrow(TypeError);
      await expect(d.save(bad)).rejects.toThrow(TypeError);
    }
    expect(() => loose.loadSync()).toThrow(TypeError);
    await expect(loose.load()).rejects.toThrow(TypeError);
  });

  it('bytes: TypeError', () => {
    expect(() => loose.fromBytes()).toThrow(TypeError);
    expect(() => loose.fromBytes(null)).toThrow(TypeError);
  });

  it('options: undefined is the default, null → TypeError', () => {
    expect(keep(Dictionary.build(['a'], undefined)).exactMatchSearch('a')).toBe(0);
    const bytes = keep(Dictionary.build(['a'], { backend: 'clone' })).toBytes();
    expect(keep(Dictionary.fromBytes(bytes, undefined)).backend).toBe('clone');
    expect(() => loose.build(['a'], null)).toThrow(TypeError);
    expect(() => loose.fromBytes(bytes, null)).toThrow(TypeError);
  });

  it('options: backend undefined is the default, backend null → TypeError', () => {
    const plain = keep(Dictionary.build(['a']));
    expect(keep(Dictionary.build(['a'], { backend: undefined })).backend).toBe(plain.backend);
    const bytes = keep(Dictionary.build(['a'], { backend: 'clone' })).toBytes();
    expect(keep(Dictionary.fromBytes(bytes, { backend: undefined })).backend).toBe('clone');
    expect(() => loose.build(['a'], { backend: null })).toThrow(TypeError);
    expect(() => loose.fromBytes(bytes, { backend: null })).toThrow(TypeError);
  });
});

describe('undefined inside the input array', () => {
  it('build input: TypeError', () => {
    expect(() => loose.build([undefined])).toThrow(TypeError);
    expect(() => loose.build(['a', undefined])).toThrow(TypeError);
    // A hole reads as undefined during iteration.
    const holey = ['a'];
    holey[2] = 'b';
    expect(() => loose.build(holey)).toThrow(TypeError);
  });
});

describe('bare string', () => {
  it("build input: Dictionary.build('abc') → TypeError", () => {
    expect(() => loose.build('abc')).toThrow(TypeError);
  });
});

describe('empty / length 1', () => {
  it('build input: empty → RangeError in every form', () => {
    expect(() => Dictionary.build([])).toThrow(RangeError);
    expect(() => Dictionary.build(new Map())).toThrow(RangeError);
    expect(() => Dictionary.build(new Set<string>())).toThrow(RangeError);
  });

  it('build input: a single key builds', () => {
    expect(keep(Dictionary.build(['x'])).exactMatchSearch('x')).toBe(0);
    expect(keep(Dictionary.build([['x', 5]])).exactMatchSearch('x')).toBe(5);
  });

  it('build key: empty string is stored by darts and found only by exactMatchSearch', () => {
    const dict = keep(Dictionary.build(['', 'a'], { backend: 'darts' }));
    expect(dict.exactMatchSearch('')).toBe(0);
    expect(dict.commonPrefixSearch('a')).toEqual([{ value: 1, length: 1 }]);
    expect(dict.traverse('')).toEqual([]);
  });

  it('build key: empty string is rejected by clone with BuildError', () => {
    expect(() => Dictionary.build([''], { backend: 'clone' })).toThrow(BuildError);
  });

  it('search text: empty → [] from prefix and traverse; exact finds only an empty key', () => {
    const dict = keep(Dictionary.build(['a']));
    expect(dict.commonPrefixSearch('')).toEqual([]);
    expect(dict.traverse('')).toEqual([]);
    expect(dict.exactMatchSearch('')).toBeUndefined();
    expect(dict.replaceWords('', () => 'x')).toBe('');
  });

  it('search text: length 1', () => {
    const dict = keep(Dictionary.build(['a']));
    expect(dict.commonPrefixSearch('a')).toEqual([{ value: 0, length: 1 }]);
    expect(dict.traverse('a')).toEqual([{ length: 1, value: 0 }]);
  });

  it("path: '' → FileNotFoundError on load, ERR_DARTS_IO on save", async () => {
    const dict = keep(Dictionary.build(['a']));
    expect(() => Dictionary.loadSync('')).toThrow(FileNotFoundError);
    await expect(Dictionary.load('')).rejects.toBeInstanceOf(FileNotFoundError);
    for (const attempt of [() => dict.saveSync(''), () => dict.save('')]) {
      try {
        await attempt();
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(DartsError);
        expect((err as DartsError).code).toBe('ERR_DARTS_IO');
      }
    }
  });

  it('bytes: length 0 → InvalidDictionaryError', () => {
    const empty = new Uint8Array(0);
    expect(() => Dictionary.fromBytes(empty)).toThrow(InvalidDictionaryError);
    expect(() => Dictionary.fromBytes(empty, { backend: 'darts' })).toThrow(InvalidDictionaryError);
    expect(() => Dictionary.fromBytes(empty, { backend: 'clone' })).toThrow(InvalidDictionaryError);
  });
});

describe('min / max / min-1 / max+1', () => {
  it('build value: 0 and 2147483647 accepted, -1 and 2147483648 → RangeError', () => {
    const dict = keep(
      Dictionary.build([
        ['min', 0],
        ['max', 2147483647],
      ])
    );
    expect(dict.exactMatchSearch('min')).toBe(0);
    expect(dict.exactMatchSearch('max')).toBe(2147483647);
    expect(() => Dictionary.build([['a', -1]])).toThrow(RangeError);
    expect(() => Dictionary.build([['a', 2147483648]])).toThrow(RangeError);
  });
});

describe('2^31 / 2^32', () => {
  it('build value: RangeError', () => {
    expect(() => Dictionary.build([['a', 2 ** 31]])).toThrow(RangeError);
    expect(() => Dictionary.build([['a', 2 ** 32]])).toThrow(RangeError);
  });
});

describe('fraction / bool / string / bigint', () => {
  it('build element: bool → TypeError', () => {
    expect(() => loose.build([true])).toThrow(TypeError);
    expect(() => loose.build(['a', false])).toThrow(TypeError);
  });

  it('build value: 1.5 → RangeError; true, "1" and 1n → TypeError', () => {
    expect(() => Dictionary.build([['a', 1.5]])).toThrow(RangeError);
    for (const v of [true, '1', 1n]) {
      expect(() => loose.build([['a', v]])).toThrow(TypeError);
    }
  });

  it('search key / text: non-string → TypeError', () => {
    const d = keep(Dictionary.build(['1'])) as any;
    for (const bad of [1, 1.5, true, 1n]) {
      expect(() => d.exactMatchSearch(bad)).toThrow(TypeError);
      expect(() => d.commonPrefixSearch(bad)).toThrow(TypeError);
      expect(() => d.traverse(bad)).toThrow(TypeError);
      expect(() => d.replaceWords(bad, {})).toThrow(TypeError);
    }
  });

  it('bytes: non-Uint8Array → TypeError', () => {
    for (const bad of [1, 'abc', true, [0, 1], new ArrayBuffer(8), new Int32Array(2)]) {
      expect(() => loose.fromBytes(bad)).toThrow(TypeError);
    }
  });

  it('options: non-string backend → TypeError', () => {
    for (const backend of [1, true, 1n, {}]) {
      expect(() => loose.build(['a'], { backend })).toThrow(TypeError);
    }
  });
});

describe('malformed tuple', () => {
  it('build input: [k], [k, v, x] and [1, v] → TypeError', () => {
    expect(() => loose.build([['a']])).toThrow(TypeError);
    expect(() => loose.build([['a', 1, 'x']])).toThrow(TypeError);
    expect(() => loose.build([[1, 1]])).toThrow(TypeError);
  });

  it('build input: strings mixed with tuples → TypeError', () => {
    expect(() => loose.build(['a', ['b', 1]])).toThrow(TypeError);
    expect(() => loose.build([['b', 1], 'a'])).toThrow(TypeError);
  });
});

describe('unknown key', () => {
  it('options: ignored', async () => {
    const opts = { backend: 'clone', extra: true } as { backend: Backend };
    const dict = keep(Dictionary.build(['a'], opts));
    expect(dict.backend).toBe('clone');
    const file = path.join(tmp.dir, 'u.darts');
    dict.saveSync(file);
    const unknown = { verbose: 1 } as object;
    expect(keep(Dictionary.fromBytes(dict.toBytes(), unknown)).backend).toBe('clone');
    expect(keep(Dictionary.loadSync(file, unknown)).backend).toBe('clone');
    expect(keep(await Dictionary.load(file, unknown)).backend).toBe('clone');
  });
});

describe('array options', () => {
  it('options: TypeError', async () => {
    const bytes = keep(Dictionary.build(['a'])).toBytes();
    const file = path.join(tmp.dir, 'a.darts');
    fs.writeFileSync(file, bytes);
    expect(() => loose.build(['a'], [])).toThrow(TypeError);
    expect(() => loose.fromBytes(bytes, [])).toThrow(TypeError);
    expect(() => loose.loadSync(file, [])).toThrow(TypeError);
    await expect(loose.load(file, [])).rejects.toThrow(TypeError);
  });
});

describe('NUL', () => {
  it('build key: TypeError', () => {
    expect(() => Dictionary.build(['a\0'])).toThrow(TypeError);
    expect(() => Dictionary.build([['\0a', 1]])).toThrow(TypeError);
  });

  it('search: exact misses, prefix and traverse stop before NUL', () => {
    const dict = keep(Dictionary.build(['a', 'ab']));
    expect(dict.exactMatchSearch('a\0')).toBeUndefined();
    expect(dict.commonPrefixSearch('ab\0')).toEqual([
      { value: 0, length: 1 },
      { value: 1, length: 2 },
    ]);
    expect(dict.commonPrefixSearch('a\0b')).toEqual([{ value: 0, length: 1 }]);
    expect(dict.traverse('a\0b')).toEqual([{ length: 1, value: 0 }]);
    expect(dict.replaceWords('a\0b', () => 'X')).toBe('X\0b');
  });
});

describe('non-ASCII / surrogate', () => {
  it('build key: stored as UTF-8, a lone surrogate as U+FFFD', () => {
    const dict = keep(Dictionary.build(['日本', '😀', '\uD800']));
    expect(dict.exactMatchSearch('日本')).toBe(0);
    expect(dict.exactMatchSearch('😀')).toBe(1);
    expect(dict.exactMatchSearch('\uFFFD')).toBe(2);
  });

  it('search: length counts UTF-16 units and never splits a surrogate pair', () => {
    const dict = keep(Dictionary.build(['日', '日本', '😀', '😀😀']));
    expect(dict.commonPrefixSearch('日本語')).toEqual([
      { value: 0, length: 1 },
      { value: 1, length: 2 },
    ]);
    expect(dict.commonPrefixSearch('😀😀😀')).toEqual([
      { value: 2, length: 2 },
      { value: 3, length: 4 },
    ]);
    expect(dict.traverse('😀😀')).toEqual([
      { length: 2, value: 2 },
      { length: 4, value: 3 },
    ]);
  });

  it('path: a URL with a non-ASCII path is accepted', async () => {
    const dict = keep(Dictionary.build(['a']));
    const url = pathToFileURL(path.join(tmp.dir, 'ディレクトリ', '辞書.darts'));
    fs.mkdirSync(path.join(tmp.dir, 'ディレクトリ'));
    await dict.save(url);
    expect(keep(await Dictionary.load(url)).exactMatchSearch('a')).toBe(0);
  });
});

describe('non-file: URL', () => {
  it("path: fs's TypeError propagates", async () => {
    const dict = keep(Dictionary.build(['a']));
    const url = new URL('http://localhost/x.darts');
    expect(() => Dictionary.loadSync(url)).toThrow(TypeError);
    await expect(Dictionary.load(url)).rejects.toThrow(TypeError);
    expect(() => dict.saveSync(url)).toThrow(TypeError);
    await expect(dict.save(url)).rejects.toThrow(TypeError);
  });
});

describe('invalid image', () => {
  const darts = () => keep(Dictionary.build(['a', 'b'], { backend: 'darts' })).toBytes();
  const clone = () => keep(Dictionary.build(['a', 'b'], { backend: 'clone' })).toBytes();

  it('bytes: length not a multiple of 8 → rejected as darts', () => {
    const bytes = darts().subarray(0, 12);
    expect(() => Dictionary.fromBytes(bytes, { backend: 'darts' })).toThrow(InvalidDictionaryError);
    expect(() => Dictionary.fromBytes(bytes)).toThrow(InvalidDictionaryError);
  });

  it('bytes: base[0] != 1 → rejected as darts', () => {
    const bytes = darts().slice();
    new DataView(bytes.buffer).setInt32(0, 2, true);
    expect(() => Dictionary.fromBytes(bytes, { backend: 'darts' })).toThrow(InvalidDictionaryError);
    expect(() => Dictionary.fromBytes(bytes)).toThrow(InvalidDictionaryError);
  });

  it('bytes: failed clone validation → rejected as clone', () => {
    const truncated = clone().subarray(0, 1020);
    expect(() => Dictionary.fromBytes(truncated, { backend: 'clone' })).toThrow(
      InvalidDictionaryError
    );
    expect(() => Dictionary.fromBytes(darts(), { backend: 'clone' })).toThrow(
      InvalidDictionaryError
    );
  });
});

describe('1,000,000-character key', () => {
  const key = 'あ'.repeat(1_000_000);

  it.each<Backend>(['darts', 'clone'])('build key: accepted (%s)', (backend) => {
    const dict = keep(Dictionary.build([key, 'あ'], { backend }));
    expect(dict.exactMatchSearch(key)).toBe(0);
  });

  it('search text: accepted, and replaceWords replaces it', () => {
    const dict = keep(Dictionary.build([key]));
    expect(dict.commonPrefixSearch(`${key}!`)).toEqual([{ value: 0, length: 1_000_000 }]);
    expect(dict.replaceWords(`<${key}>`, () => 'K')).toBe('<K>');
  });
});

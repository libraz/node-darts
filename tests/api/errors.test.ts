import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BuildError,
  DartsError,
  Dictionary,
  FileNotFoundError,
  InvalidDictionaryError,
} from '../../src';
import { makeTempDir } from './helpers';

let tmp: ReturnType<typeof makeTempDir>;
beforeEach(() => {
  tmp = makeTempDir();
});
afterEach(() => tmp.cleanup());

/** Calls `fn` and returns what it threw, failing if it did not throw. */
function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected a throw');
}

async function rejected(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected a rejection');
}
const loose = Dictionary as any;

describe('error classes', () => {
  it('DartsError carries code and cause', () => {
    const cause = new Error('inner');
    const err = new DartsError('io failed', { code: 'ERR_DARTS_IO', cause });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('ERR_DARTS_IO');
    expect(err.cause).toBe(cause);
    expect(err.name).toBe('DartsError');
  });

  it('subclasses fix their code and extend DartsError', () => {
    const notFound = new FileNotFoundError('/x.darts');
    expect(notFound).toBeInstanceOf(DartsError);
    expect(notFound.code).toBe('ERR_DARTS_FILE_NOT_FOUND');
    expect(notFound.path).toBe('/x.darts');
    expect(notFound.name).toBe('FileNotFoundError');

    const invalid = new InvalidDictionaryError('bad');
    expect(invalid).toBeInstanceOf(DartsError);
    expect(invalid.code).toBe('ERR_DARTS_INVALID_DICTIONARY');
    expect(invalid.name).toBe('InvalidDictionaryError');

    const cause = new Error('core');
    const build = new BuildError('bad keys', { cause });
    expect(build).toBeInstanceOf(DartsError);
    expect(build.code).toBe('ERR_DARTS_BUILD_FAILED');
    expect(build.cause).toBe(cause);
    expect(build.name).toBe('BuildError');
  });
});

describe('argument type errors → TypeError', () => {
  const dict = Dictionary.build(['a']);
  const d = dict as any;

  it('non-string key or text', () => {
    for (const bad of [1, null, undefined, {}, ['a']]) {
      expect(() => d.exactMatchSearch(bad)).toThrow(TypeError);
      expect(() => d.commonPrefixSearch(bad)).toThrow(TypeError);
      expect(() => d.traverse(bad)).toThrow(TypeError);
      expect(() => d.replaceWords(bad, {})).toThrow(TypeError);
    }
  });

  it('build input, element and value types', () => {
    expect(() => loose.build(42)).toThrow(TypeError);
    expect(() => loose.build([1])).toThrow(TypeError);
    expect(() => loose.build([['a', '1']])).toThrow(TypeError);
  });

  it('replacer type and return value', () => {
    for (const bad of [null, undefined, 1, 'x']) {
      expect(() => d.replaceWords('a', bad)).toThrow(TypeError);
    }
    expect(() => d.replaceWords('a', () => undefined)).toThrow(TypeError);
  });

  it('path that is neither string nor URL', async () => {
    for (const bad of [1, null, undefined, {}, Buffer.from('x')]) {
      expect(() => loose.loadSync(bad)).toThrow(TypeError);
      expect(() => d.saveSync(bad)).toThrow(TypeError);
      await expect(loose.load(bad)).rejects.toThrow(TypeError);
      await expect(d.save(bad)).rejects.toThrow(TypeError);
    }
  });

  it('async entry points reject instead of throwing synchronously', async () => {
    let promise: Promise<unknown> | undefined;
    expect(() => {
      promise = loose.load(1);
    }).not.toThrow();
    await expect(promise).rejects.toThrow(TypeError);
    expect(() => {
      promise = d.save(1);
    }).not.toThrow();
    await expect(promise).rejects.toThrow(TypeError);
  });

  it('bytes that are not a Uint8Array', () => {
    for (const bad of [[1, 2], new ArrayBuffer(8), 'abc', null]) {
      expect(() => loose.fromBytes(bad)).toThrow(TypeError);
    }
  });

  it('options type and backend value', async () => {
    const file = path.join(tmp.dir, 'opt.darts');
    dict.saveSync(file);
    const bytes = dict.toBytes();
    for (const bad of [null, 1, 'darts', [], { backend: 'other' }, { backend: null }]) {
      expect(() => loose.build(['a'], bad)).toThrow(TypeError);
      expect(() => loose.fromBytes(bytes, bad)).toThrow(TypeError);
      expect(() => loose.loadSync(file, bad)).toThrow(TypeError);
      await expect(loose.load(file, bad)).rejects.toThrow(TypeError);
    }
  });
});

describe('NUL in a build key → TypeError', () => {
  it('rejects in both input forms', () => {
    expect(() => Dictionary.build(['a\0b'])).toThrow(TypeError);
    expect(() => Dictionary.build([['\0', 1]])).toThrow(TypeError);
  });
});

describe('value out of range, non-integer, NaN, ±Inf, empty input → RangeError', () => {
  it('rejects each', () => {
    for (const bad of [-1, 2147483648, 1.5, Number.NaN, Infinity, -Infinity]) {
      expect(() => Dictionary.build([['a', bad]])).toThrow(RangeError);
    }
    expect(() => Dictionary.build([])).toThrow(RangeError);
  });
});

describe('missing file (load / loadSync ENOENT) → FileNotFoundError', () => {
  it('reports the path and the fs error as cause', async () => {
    const file = path.join(tmp.dir, 'absent.darts');
    for (const err of [
      thrown(() => Dictionary.loadSync(file)),
      await rejected(Dictionary.load(file)),
    ]) {
      expect(err).toBeInstanceOf(FileNotFoundError);
      const e = err as FileNotFoundError;
      expect(e.code).toBe('ERR_DARTS_FILE_NOT_FOUND');
      expect(e.path).toBe(file);
      expect((e.cause as NodeJS.ErrnoException).code).toBe('ENOENT');
    }
  });

  it('reports a URL as its file path', async () => {
    const file = path.join(tmp.dir, 'absent.darts');
    const err = await rejected(Dictionary.load(pathToFileURL(file)));
    expect((err as FileNotFoundError).path).toBe(file);
    expect((thrown(() => Dictionary.loadSync(pathToFileURL(file))) as FileNotFoundError).path).toBe(
      file
    );
  });
});

describe('bytes invalid for every backend or for the requested one → InvalidDictionaryError', () => {
  it('rejects garbage from every entry point', async () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7]);
    const file = path.join(tmp.dir, 'garbage.darts');
    fs.writeFileSync(file, garbage);
    for (const err of [
      thrown(() => Dictionary.fromBytes(garbage)),
      thrown(() => Dictionary.loadSync(file)),
      await rejected(Dictionary.load(file)),
    ]) {
      expect(err).toBeInstanceOf(InvalidDictionaryError);
      expect((err as InvalidDictionaryError).code).toBe('ERR_DARTS_INVALID_DICTIONARY');
    }
  });

  it('rejects a valid image read as the other backend', () => {
    const darts = Dictionary.build(['a', 'b'], { backend: 'darts' }).toBytes();
    const err = thrown(() => Dictionary.fromBytes(darts, { backend: 'clone' }));
    expect(err).toBeInstanceOf(InvalidDictionaryError);
    expect((err as InvalidDictionaryError).code).toBe('ERR_DARTS_INVALID_DICTIONARY');
  });
});

describe('other read/write failures → DartsError ERR_DARTS_IO', () => {
  it('reading a directory', async () => {
    for (const err of [
      thrown(() => Dictionary.loadSync(tmp.dir)),
      await rejected(Dictionary.load(tmp.dir)),
    ]) {
      expect(err).toBeInstanceOf(DartsError);
      expect(err).not.toBeInstanceOf(FileNotFoundError);
      expect((err as DartsError).code).toBe('ERR_DARTS_IO');
      expect((err as DartsError).cause).toBeInstanceOf(Error);
    }
  });

  it('saving into a missing directory (ENOENT)', async () => {
    const dict = Dictionary.build(['a']);
    const file = path.join(tmp.dir, 'missing', 'x.darts');
    for (const err of [thrown(() => dict.saveSync(file)), await rejected(dict.save(file))]) {
      expect(err).toBeInstanceOf(DartsError);
      expect(err).not.toBeInstanceOf(FileNotFoundError);
      expect((err as DartsError).code).toBe('ERR_DARTS_IO');
      expect(((err as DartsError).cause as NodeJS.ErrnoException).code).toBe('ENOENT');
    }
    dict.dispose();
  });
});

describe('fs argument errors (non-file: URL) → fs TypeError, unwrapped', () => {
  it('propagates from every path entry point', async () => {
    const url = new URL('https://example.com/x.darts');
    const dict = Dictionary.build(['a']);
    for (const err of [
      thrown(() => Dictionary.loadSync(url)),
      await rejected(Dictionary.load(url)),
      thrown(() => dict.saveSync(url)),
      await rejected(dict.save(url)),
    ]) {
      expect(err).toBeInstanceOf(TypeError);
      expect((err as NodeJS.ErrnoException).code).toBe('ERR_INVALID_URL_SCHEME');
    }
    dict.dispose();
  });
});

describe('core rejects the build → BuildError', () => {
  it('carries the core reason for an empty key (clone)', () => {
    const err = thrown(() => Dictionary.build(['', 'a'], { backend: 'clone' }));
    expect(err).toBeInstanceOf(BuildError);
    expect((err as BuildError).code).toBe('ERR_DARTS_BUILD_FAILED');
    expect((err as BuildError).message).toContain('zero-length key');
  });
});

describe('use after dispose → DartsError ERR_DARTS_DISPOSED', () => {
  it('rejects every method except the getters and dispose', async () => {
    const dict = Dictionary.build(['a']);
    dict.dispose();
    const file = path.join(tmp.dir, 'disposed.darts');
    const errors = [
      thrown(() => dict.exactMatchSearch('a')),
      thrown(() => dict.commonPrefixSearch('a')),
      thrown(() => dict.traverse('a')),
      thrown(() => dict.replaceWords('a', {})),
      thrown(() => dict.toBytes()),
      thrown(() => dict.saveSync(file)),
      await rejected(dict.save(file)),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(DartsError);
      expect((err as DartsError).code).toBe('ERR_DARTS_DISPOSED');
    }
    expect(fs.existsSync(file)).toBe(false);
  });

  it('stops replaceWords when the replacer disposes the dictionary', () => {
    const dict = Dictionary.build(['a']);
    const err = thrown(() =>
      dict.replaceWords('a a', () => {
        dict.dispose();
        return 'x';
      })
    );
    expect((err as DartsError).code).toBe('ERR_DARTS_DISPOSED');
  });
});

describe('replacer function throws → propagated unwrapped', () => {
  it('rethrows the same error', () => {
    const dict = Dictionary.build(['a']);
    const boom = new Error('boom');
    expect(
      thrown(() =>
        dict.replaceWords('a', () => {
          throw boom;
        })
      )
    ).toBe(boom);
    dict.dispose();
  });
});

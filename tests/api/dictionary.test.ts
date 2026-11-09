import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Backend, DartsError, Dictionary } from '../../src';
import { makeTempDir } from './helpers';

const BACKENDS: Backend[] = ['darts', 'clone'];

let tmp: ReturnType<typeof makeTempDir>;
beforeEach(() => {
  tmp = makeTempDir();
});
afterEach(() => {
  tmp.cleanup();
  vi.restoreAllMocks();
});

describe('Dictionary.build', () => {
  it('assigns each string key its input-order index', () => {
    const dict = Dictionary.build(['banana', 'apple', 'cherry']);
    expect(dict.exactMatchSearch('banana')).toBe(0);
    expect(dict.exactMatchSearch('apple')).toBe(1);
    expect(dict.exactMatchSearch('cherry')).toBe(2);
    dict.dispose();
  });

  it('takes [key, value] tuples', () => {
    const dict = Dictionary.build([
      ['b', 20],
      ['a', 10],
    ]);
    expect(dict.exactMatchSearch('a')).toBe(10);
    expect(dict.exactMatchSearch('b')).toBe(20);
    dict.dispose();
  });

  it('takes a Map', () => {
    const dict = Dictionary.build(
      new Map([
        ['東京', 1],
        ['東京都', 2],
      ])
    );
    expect(dict.exactMatchSearch('東京')).toBe(1);
    expect(dict.exactMatchSearch('東京都')).toBe(2);
    dict.dispose();
  });

  it('keeps the first occurrence of a duplicate key in either form', () => {
    const strings = Dictionary.build(['a', 'b', 'a']);
    expect(strings.exactMatchSearch('a')).toBe(0);
    expect(strings.exactMatchSearch('b')).toBe(1);
    const tuples = Dictionary.build([
      ['a', 5],
      ['a', 6],
    ]);
    expect(tuples.exactMatchSearch('a')).toBe(5);
    strings.dispose();
    tuples.dispose();
  });

  it('accepts keys in any order', () => {
    const dict = Dictionary.build(['zeta', 'alpha', 'mu', 'alp']);
    expect(dict.exactMatchSearch('alp')).toBe(3);
    expect(dict.exactMatchSearch('zeta')).toBe(0);
    dict.dispose();
  });

  it('iterates the input once and leaves it unchanged', () => {
    let passes = 0;
    const once = {
      *[Symbol.iterator]() {
        passes += 1;
        yield 'x';
        yield 'y';
      },
    };
    const dict = Dictionary.build(once);
    expect(passes).toBe(1);
    expect(dict.exactMatchSearch('y')).toBe(1);

    const frozen = Object.freeze(['c', 'a', 'b']);
    Dictionary.build(frozen).dispose();
    expect(frozen).toEqual(['c', 'a', 'b']);
    dict.dispose();
  });

  it.each(BACKENDS)('builds with backend %s', (backend) => {
    const dict = Dictionary.build(['a'], { backend });
    expect(dict.backend).toBe(backend);
    dict.dispose();
  });

  it('cannot be constructed directly', () => {
    const Ctor = Dictionary as unknown as new () => Dictionary;
    expect(() => new Ctor()).toThrow(TypeError);
  });
});

describe('save / load / loadSync / fromBytes / toBytes', () => {
  it.each(BACKENDS)('round-trips a %s dictionary through every path', async (backend) => {
    const dict = Dictionary.build(
      [
        ['apple', 3],
        ['banana', 7],
      ],
      { backend }
    );
    const asyncFile = path.join(tmp.dir, 'async.darts');
    const syncFile = path.join(tmp.dir, 'sync.darts');
    await expect(dict.save(asyncFile)).resolves.toBeUndefined();
    expect(dict.saveSync(syncFile)).toBeUndefined();

    const bytes = dict.toBytes();
    expect(new Uint8Array(fs.readFileSync(asyncFile))).toEqual(bytes);
    expect(new Uint8Array(fs.readFileSync(syncFile))).toEqual(bytes);

    const loaded = [
      await Dictionary.load(asyncFile),
      Dictionary.loadSync(syncFile),
      Dictionary.fromBytes(bytes),
      await Dictionary.load(asyncFile, { backend }),
      Dictionary.loadSync(syncFile, { backend }),
      Dictionary.fromBytes(bytes, { backend }),
    ];
    for (const d of loaded) {
      expect(d).toBeInstanceOf(Dictionary);
      expect(d).not.toBe(dict);
      expect(d.backend).toBe(backend);
      expect(d.exactMatchSearch('banana')).toBe(7);
      expect(d.toBytes()).toEqual(bytes);
      d.dispose();
    }
    dict.dispose();
  });

  it('accepts file URLs, including non-ASCII paths', async () => {
    const dict = Dictionary.build(['a'], { backend: 'clone' });
    const url = pathToFileURL(path.join(tmp.dir, '辞書 ファイル.darts'));
    await dict.save(url);
    const loaded = await Dictionary.load(url);
    expect(loaded.backend).toBe('clone');
    dict.saveSync(url);
    const loadedSync = Dictionary.loadSync(url);
    expect(loadedSync.exactMatchSearch('a')).toBe(0);
    for (const d of [dict, loaded, loadedSync]) d.dispose();
  });

  it.each(BACKENDS)('detects a %s image without a backend option', (backend) => {
    const bytes = Dictionary.build(['a', 'b'], { backend }).toBytes();
    const d = Dictionary.fromBytes(bytes);
    expect(d.backend).toBe(backend);
    d.dispose();
  });

  it('accepts a Buffer in fromBytes', () => {
    const bytes = Dictionary.build(['a']).toBytes();
    const d = Dictionary.fromBytes(Buffer.from(bytes));
    expect(d.exactMatchSearch('a')).toBe(0);
    d.dispose();
  });

  it('returns a copy from toBytes that outlives the dictionary', () => {
    const dict = Dictionary.build(['abc']);
    const first = dict.toBytes();
    const pristine = first.slice();
    first.fill(0xff);
    expect(dict.toBytes()).toEqual(pristine);
    dict.dispose();
    expect(Dictionary.fromBytes(pristine).exactMatchSearch('abc')).toBe(0);
  });

  it('takes the image at the call, before the write completes', async () => {
    const dict = Dictionary.build(['k']);
    const bytes = dict.toBytes();
    const file = path.join(tmp.dir, 'snapshot.darts');
    const pending = dict.save(file);
    dict.dispose();
    await pending;
    expect(new Uint8Array(fs.readFileSync(file))).toEqual(bytes);
  });

  it('does not create the parent directory', () => {
    const dict = Dictionary.build(['k']);
    expect(() => dict.saveSync(path.join(tmp.dir, 'missing', 'x.darts'))).toThrow(DartsError);
    expect(fs.existsSync(path.join(tmp.dir, 'missing'))).toBe(false);
    dict.dispose();
  });
});

describe('getters', () => {
  it.each(BACKENDS)('backend, byteLength and disposed before and after dispose (%s)', (backend) => {
    const dict = Dictionary.build(['a', 'bc'], { backend });
    const length = dict.toBytes().length;
    expect(dict.backend).toBe(backend);
    expect(dict.byteLength).toBe(length);
    expect(dict.disposed).toBe(false);
    dict.dispose();
    expect(dict.backend).toBe(backend);
    expect(dict.byteLength).toBe(length);
    expect(dict.disposed).toBe(true);
  });

  it('are read-only', () => {
    const dict = Dictionary.build(['a']);
    expect(() => {
      (dict as unknown as { backend: string }).backend = 'clone';
    }).toThrow(TypeError);
    dict.dispose();
  });
});

describe('dispose', () => {
  it('is idempotent', () => {
    const dict = Dictionary.build(['a']);
    dict.dispose();
    expect(() => dict.dispose()).not.toThrow();
    expect(dict.disposed).toBe(true);
  });

  it('is what Symbol.dispose calls', () => {
    const dict = Dictionary.build(['a']);
    dict[Symbol.dispose]();
    expect(dict.disposed).toBe(true);
    expect(() => dict[Symbol.dispose]()).not.toThrow();
  });

  it('runs at the end of a using block', () => {
    let held: Dictionary | undefined;
    {
      using dict = Dictionary.build(['a']);
      held = dict;
      expect(dict.exactMatchSearch('a')).toBe(0);
    }
    expect(held.disposed).toBe(true);
  });

  it('unregisters the finalizer once', () => {
    const unregister = vi.spyOn(FinalizationRegistry.prototype, 'unregister');
    const dict = Dictionary.build(['a']);
    dict.dispose();
    dict.dispose();
    const calls = unregister.mock.calls.filter(([token]) => token === dict);
    expect(calls).toHaveLength(1);
  });

  it('frees the handle so a later dictionary does not see stale contents', () => {
    const a = Dictionary.build(['only-in-a']);
    a.dispose();
    const b = Dictionary.build(['only-in-b']);
    expect(b.exactMatchSearch('only-in-a')).toBeUndefined();
    expect(b.exactMatchSearch('only-in-b')).toBe(0);
    b.dispose();
  });
});

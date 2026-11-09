import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DartsError, FileNotFoundError } from './errors.js';
import * as core from './internal/core.js';
import { getDefaultBackend } from './internal/defaults.js';
import { utf8Width, utf16Offsets } from './internal/utf.js';
import type {
  Backend,
  BuildInput,
  BuildOptions,
  LoadOptions,
  PrefixMatch,
  TraverseStep,
  WordReplacer,
} from './types.js';

const encoder = new TextEncoder();

// Frees the core memory of a dictionary that is collected without dispose().
const registry = new FinalizationRegistry<number>((handle) => core.destroy(handle));

const constructing = Symbol('Dictionary');

/**
 * A double-array trie dictionary mapping string keys to non-negative 32-bit
 * integers.
 *
 * Create one with {@link Dictionary.build}, {@link Dictionary.load},
 * {@link Dictionary.loadSync} or {@link Dictionary.fromBytes}. Every instance
 * holds at least one key. Release it with {@link Dictionary.dispose} (or a
 * `using` declaration in TypeScript / Node 24+); a dictionary that is garbage
 * collected first is released then.
 *
 * Lengths in results count UTF-16 code units, so `text.slice(0, length)` is
 * the matched key. Keys are stored as UTF-8; a lone surrogate is stored and
 * searched as U+FFFD.
 *
 * @example
 * ```ts
 * import { Dictionary } from 'node-darts';
 *
 * const dict = Dictionary.build(new Map([['東京', 1], ['東京都', 2]]));
 * dict.exactMatchSearch('東京');         // 1
 * dict.exactMatchSearch('大阪');         // undefined
 * dict.commonPrefixSearch('東京都庁');   // [{ value: 1, length: 2 }, { value: 2, length: 3 }]
 * await dict.save('cities.darts');
 * dict.dispose();
 * ```
 */
export class Dictionary {
  readonly #handle: number;
  readonly #backend: Backend;
  readonly #byteLength: number;
  #disposed = false;

  private constructor(token: unknown, handle: number) {
    if (token !== constructing) {
      throw new TypeError(
        'Dictionary cannot be constructed directly; use Dictionary.build, load, loadSync or fromBytes'
      );
    }
    this.#handle = handle;
    this.#backend = core.backendOf(handle);
    this.#byteLength = core.byteLength(handle, this.#backend);
    registry.register(this, handle, this);
  }

  /**
   * Builds a dictionary from keys.
   *
   * `input` is an iterable of strings, each valued by its input-order index,
   * or of `[key, value]` pairs such as a `Map`; all elements use one form. Keys
   * may come in any order (they are sorted internally); a duplicate key keeps
   * its first occurrence and value. The input is iterated once and not
   * modified.
   *
   * The empty key is stored by the `'darts'` backend, where only
   * `exactMatchSearch('')` finds it, and rejected by `'clone'`.
   *
   * @param input Keys, or `[key, value]` pairs with values in 0..2147483647.
   * @param options `backend` selects the layout; `'darts'` by default.
   * @throws {TypeError} `input` is a string or not iterable, an element is
   *   neither a string nor a `[string, number]` pair, the forms are mixed, a
   *   value is not a number, a key contains NUL, or `options` is invalid.
   * @throws {RangeError} `input` is empty, or a value is not an integer in
   *   0..2147483647.
   * @throws {BuildError} The builder rejected the keys.
   *
   * @example
   * ```ts
   * Dictionary.build(['apple', 'banana']);                // apple → 0, banana → 1
   * Dictionary.build([['a', 10], ['b', 20]], { backend: 'clone' });
   * ```
   */
  static build(input: BuildInput, options?: BuildOptions): Dictionary {
    const backend = core.backendOption(options) ?? getDefaultBackend();
    return new Dictionary(constructing, core.build(input, backend));
  }

  /**
   * Reads a dictionary file without blocking the event loop.
   *
   * Every failure, including an invalid argument, rejects the promise.
   *
   * @param path File path or `file:` URL.
   * @param options `backend` reads the bytes as that layout only; by default
   *   darts-clone is tried first, then Darts.
   * @throws {TypeError} Invalid `path` or `options`; `fs` argument errors
   *   such as a non-`file:` URL are passed through.
   * @throws {FileNotFoundError} The file does not exist.
   * @throws {InvalidDictionaryError} The bytes are not a dictionary image.
   * @throws {DartsError} `ERR_DARTS_IO` for any other read failure.
   */
  static async load(path: string | URL, options?: LoadOptions): Promise<Dictionary> {
    const target = core.checkPath(path);
    const backend = core.backendOption(options);
    let image: Uint8Array;
    try {
      image = await fs.promises.readFile(target);
    } catch (error) {
      throw readFailure(error, target);
    }
    return new Dictionary(constructing, core.load(image, backend));
  }

  /**
   * Reads a dictionary file synchronously. See {@link Dictionary.load}.
   */
  static loadSync(path: string | URL, options?: LoadOptions): Dictionary {
    const target = core.checkPath(path);
    const backend = core.backendOption(options);
    let image: Uint8Array;
    try {
      image = fs.readFileSync(target);
    } catch (error) {
      throw readFailure(error, target);
    }
    return new Dictionary(constructing, core.load(image, backend));
  }

  /**
   * Reads a dictionary image held in memory, such as the result of
   * {@link Dictionary.toBytes} or bytes from a database or bundled asset.
   *
   * @param bytes The image; a `Buffer` works. It is copied.
   * @param options See {@link Dictionary.load}.
   * @throws {TypeError} `bytes` is not a `Uint8Array`, or `options` is invalid.
   * @throws {InvalidDictionaryError} The bytes are not a dictionary image.
   */
  static fromBytes(bytes: Uint8Array, options?: LoadOptions): Dictionary {
    const image = core.checkBytes(bytes);
    const backend = core.backendOption(options);
    return new Dictionary(constructing, core.load(image, backend));
  }

  /**
   * Writes the dictionary image to a file without blocking the event loop.
   * The image is taken when the method is called; the parent directory must
   * exist.
   *
   * Every failure, including an invalid argument, rejects the promise.
   *
   * @param path File path or `file:` URL.
   * @throws {TypeError} Invalid `path`; `fs` argument errors are passed through.
   * @throws {DartsError} `ERR_DARTS_IO` for any write failure (the `fs` error
   *   is the `cause`), or `ERR_DARTS_DISPOSED`.
   */
  async save(path: string | URL): Promise<void> {
    const target = core.checkPath(path);
    const image = this.toBytes();
    try {
      await fs.promises.writeFile(target, image);
    } catch (error) {
      throw writeFailure(error);
    }
  }

  /**
   * Writes the dictionary image to a file synchronously. See {@link Dictionary.save}.
   */
  saveSync(path: string | URL): void {
    const target = core.checkPath(path);
    const image = this.toBytes();
    try {
      fs.writeFileSync(target, image);
    } catch (error) {
      throw writeFailure(error);
    }
  }

  /**
   * Returns a copy of the dictionary image, the bytes {@link Dictionary.save}
   * writes. It stays valid after the dictionary is disposed.
   *
   * @throws {DartsError} `ERR_DARTS_DISPOSED`.
   */
  toBytes(): Uint8Array {
    return core.toBytes(this.#live());
  }

  /**
   * Looks up a key.
   *
   * @param key The whole key; a key containing NUL is never found.
   * @returns The key's value, or `undefined` if it is not in the dictionary.
   * @throws {TypeError} `key` is not a string.
   * @throws {DartsError} `ERR_DARTS_DISPOSED`.
   */
  exactMatchSearch(key: string): number | undefined {
    core.checkString(key, 'key');
    const handle = this.#live();
    const { ptr, len } = core.writeKey(key);
    const value = core.exact(handle, ptr, len);
    return value >= 0 ? value : undefined;
  }

  /**
   * Finds every key that `text` starts with, shortest first. The empty key is
   * never reported, and the search stops at the first NUL.
   *
   * @returns The matches; `text.slice(0, length)` is each matched key.
   * @throws {TypeError} `text` is not a string.
   * @throws {DartsError} `ERR_DARTS_DISPOSED`.
   *
   * @example
   * ```ts
   * for (const { value, length } of dict.commonPrefixSearch('東京都庁')) {
   *   console.log('東京都庁'.slice(0, length), value);
   * }
   * ```
   */
  commonPrefixSearch(text: string): PrefixMatch[] {
    core.checkString(text, 'text');
    const handle = this.#live();
    const { ptr, len } = core.writeKey(text);
    const pairs = core.prefix(handle, ptr, len);
    if (pairs.length === 0) return [];
    const offsets = utf16Offsets(text, len);
    const matches: PrefixMatch[] = [];
    for (let i = 0; i < pairs.length; i += 2) {
      // -1 marks a match ending inside a character, possible only in non-UTF-8 dictionaries.
      const length = offsets[pairs[i + 1]];
      if (length > 0) matches.push({ value: pairs[i], length });
    }
    return matches;
  }

  /**
   * Walks the trie along `text` one code point at a time and reports the
   * state after each. The walk ends before the first character that leaves the
   * trie (also when it leaves partway through the character) and at the first
   * NUL.
   *
   * @returns One step per character consumed, with the value of the key that
   *   ends there, if any.
   * @throws {TypeError} `text` is not a string.
   * @throws {DartsError} `ERR_DARTS_DISPOSED`.
   *
   * @example
   * ```ts
   * dict.traverse('東京タワー');
   * // [{ length: 1, value: undefined }, { length: 2, value: 1 }]
   * ```
   */
  traverse(text: string): TraverseStep[] {
    core.checkString(text, 'text');
    const handle = this.#live();
    const { ptr, len } = core.writeKey(text);
    const cursor: core.Cursor = { node: 0, pos: 0 };
    const steps: TraverseStep[] = [];
    let unit = 0;
    while (unit < text.length) {
      const codePoint = text.codePointAt(unit) as number;
      let value = -1;
      for (let i = utf8Width(codePoint); i > 0; i -= 1) {
        value = core.step(handle, ptr, len, cursor);
        if (value === -2) return steps;
      }
      unit += codePoint > 0xffff ? 2 : 1;
      steps.push({ length: unit, value: value >= 0 ? value : undefined });
    }
    return steps;
  }

  /**
   * Replaces dictionary keys found in `text`. Scanning left to right, the
   * longest key starting at each position is replaced and skipped; elsewhere
   * the scan advances one code point. Keys of any length match.
   *
   * @param replacer A function `(match, value) => string`, or a `Map` or
   *   object whose own properties map matched text to its replacement; a match
   *   they do not cover is kept.
   * @throws {TypeError} `text` is not a string, `replacer` is none of the
   *   above, or a replacement is not a string. An error thrown by the replacer
   *   function propagates unchanged.
   * @throws {DartsError} `ERR_DARTS_DISPOSED`, also when the replacer disposes
   *   the dictionary.
   *
   * @example
   * ```ts
   * dict.replaceWords('I like apple', (match, value) => `<${match}:${value}>`);
   * dict.replaceWords('I like apple', new Map([['apple', 'pear']]));
   * ```
   */
  replaceWords(text: string, replacer: WordReplacer): string {
    core.checkString(text, 'text');
    const replace = core.checkReplacer(replacer);
    this.#live();
    const bytes = encoder.encode(text);
    const offsets = utf16Offsets(text, bytes.length);
    // A buffer of its own: the replacer may run other searches.
    return core.withBytes(bytes, (ptr) => {
      let out = '';
      let kept = 0;
      let unit = 0;
      let byte = 0;
      while (unit < text.length) {
        const pairs = core.prefix(this.#live(), ptr + byte, bytes.length - byte);
        let end = -1;
        let value = 0;
        let width = 0;
        for (let i = pairs.length - 2; i >= 0; i -= 2) {
          end = offsets[byte + pairs[i + 1]];
          if (end > unit) {
            value = pairs[i];
            width = pairs[i + 1];
            break;
          }
        }
        if (width > 0) {
          const match = text.slice(unit, end);
          out += text.slice(kept, unit) + (replace(match, value) ?? match);
          unit = end;
          byte += width;
          kept = unit;
        } else {
          const codePoint = text.codePointAt(unit) as number;
          byte += utf8Width(codePoint);
          unit += codePoint > 0xffff ? 2 : 1;
        }
      }
      return out + text.slice(kept);
    });
  }

  /** Layout of the dictionary. Readable after dispose. */
  get backend(): Backend {
    return this.#backend;
  }

  /** Size of the dictionary image in bytes (not a key count). Readable after dispose. */
  get byteLength(): number {
    return this.#byteLength;
  }

  /** Whether {@link Dictionary.dispose} has been called. */
  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Releases the dictionary's memory. Calling it again does nothing; any
   * other method then throws `DartsError` with code `ERR_DARTS_DISPOSED`.
   */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    registry.unregister(this);
    core.destroy(this.#handle);
  }

  /** Same as {@link Dictionary.dispose}; supports `using` declarations. */
  [Symbol.dispose](): void {
    this.dispose();
  }

  /** The handle, or a disposed error. */
  #live(): number {
    if (this.#disposed) throw core.disposedError();
    return this.#handle;
  }
}

function readFailure(error: unknown, target: string | URL): unknown {
  if (error instanceof TypeError) return error;
  const cause = error as NodeJS.ErrnoException;
  if (cause.code === 'ENOENT') {
    const path = typeof target === 'string' ? target : fileURLToPath(target);
    return new FileNotFoundError(path, { cause });
  }
  return new DartsError(`cannot read the dictionary file: ${cause.message}`, {
    code: 'ERR_DARTS_IO',
    cause,
  });
}

function writeFailure(error: unknown): unknown {
  if (error instanceof TypeError) return error;
  return new DartsError(`cannot write the dictionary file: ${(error as Error).message}`, {
    code: 'ERR_DARTS_IO',
    cause: error,
  });
}

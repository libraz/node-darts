import { DartsError } from './errors.js';
import { dartsNative } from './native.js';
import type { Backend, LoadOptions, TraverseCallback, WordReplacer } from './types.js';

/** Maximum length of a single match attempted by replaceWords. */
const REPLACE_WORDS_MAX_LEN = 50;

/**
 * Darts Dictionary class
 * Provides dictionary search using Double-Array Trie
 */
export default class Dictionary {
  private handle: number;

  private isDisposed: boolean;

  /**
   * Constructor
   * @param handleOrBackend Either an existing native handle (when wrapping a
   *   handle returned by buildDictionary), or a backend kind to allocate a
   *   fresh empty dictionary for. Defaults to allocating a 'darts' backend.
   */
  constructor(handleOrBackend?: number | Backend) {
    if (typeof handleOrBackend === 'number') {
      this.handle = handleOrBackend;
    } else {
      this.handle = dartsNative.createDictionary(handleOrBackend);
    }
    this.isDisposed = false;
  }

  /**
   * Gets the native handle
   * @returns The native handle
   */
  public getHandle(): number {
    this.ensureNotDisposed();
    return this.handle;
  }

  /**
   * Reports whether the dictionary has been disposed.
   */
  public get disposed(): boolean {
    return this.isDisposed;
  }

  /**
   * Performs an exact match search
   * @param key search key
   * @returns the corresponding value if found, -1 otherwise
   * @throws {DartsError} if the search fails
   */
  public exactMatchSearch(key: string): number {
    this.ensureNotDisposed();

    if (this.size() === 0) {
      return -1;
    }

    return dartsNative.exactMatchSearch(this.handle, key);
  }

  /**
   * Performs a common prefix search
   * @param key search key
   * @returns array of found values
   * @throws {DartsError} if the search fails
   */
  public commonPrefixSearch(key: string): number[] {
    this.ensureNotDisposed();

    if (this.size() === 0) {
      return [];
    }

    return dartsNative.commonPrefixSearch(this.handle, key);
  }

  /**
   * Traverses the trie
   * @param key search key
   * @param callback callback function
   * @throws {DartsError} if the traversal fails
   */
  public traverse(key: string, callback: TraverseCallback): void {
    this.ensureNotDisposed();
    dartsNative.traverse(this.handle, key, callback);
  }

  /**
   * Loads a dictionary file asynchronously
   * @param filePath path to the dictionary file
   * @param options optional load options ({ backend?: 'darts' | 'clone' }).
   *   When omitted, the loader auto-detects.
   * @returns true if successful, false otherwise
   * @throws {FileNotFoundError} if the file is not found
   * @throws {InvalidDictionaryError} if the dictionary file is invalid
   */
  public async load(filePath: string, options?: LoadOptions): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        resolve(this.loadSync(filePath, options));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Loads a dictionary file synchronously
   * @param filePath path to the dictionary file
   * @param options optional load options ({ backend?: 'darts' | 'clone' }).
   *   When omitted, the loader auto-detects.
   * @returns true if successful, false otherwise
   * @throws {FileNotFoundError} if the file is not found
   * @throws {InvalidDictionaryError} if the dictionary file is invalid
   */
  public loadSync(filePath: string, options?: LoadOptions): boolean {
    this.ensureNotDisposed();
    return dartsNative.loadDictionary(this.handle, filePath, options?.backend);
  }

  /**
   * Returns the backend kind currently held by this dictionary
   * ('darts' for taku910/darts, 'clone' for s-yata/darts-clone).
   */
  public getBackend(): Backend {
    this.ensureNotDisposed();
    return dartsNative.getBackend(this.handle);
  }

  /**
   * Gets the size of the dictionary
   * @returns size of the dictionary
   * @throws {DartsError} if getting the size fails
   */
  public size(): number {
    this.ensureNotDisposed();
    return dartsNative.size(this.handle);
  }

  /**
   * Searches for dictionary words in a text and replaces them
   * @param text The text to search in
   * @param replacer The replacement method (function or object)
   * @returns The text after replacement
   */
  public replaceWords(text: string, replacer: WordReplacer): string {
    this.ensureNotDisposed();

    const replaceFn =
      typeof replacer === 'function' ? replacer : (match: string) => replacer[match] ?? match;

    let result = '';
    let position = 0;

    while (position < text.length) {
      let matchFound = false;

      const maxLen = Math.min(REPLACE_WORDS_MAX_LEN, text.length - position);
      for (let len = maxLen; len > 0; len -= 1) {
        const word = text.substring(position, position + len);
        if (this.exactMatchSearch(word) !== -1) {
          result += replaceFn(word);
          position += len;
          matchFound = true;
          break;
        }
      }

      if (!matchFound) {
        result += text[position];
        position += 1;
      }
    }

    return result;
  }

  /**
   * Releases resources
   * After calling this method, this object can no longer be used
   */
  public dispose(): void {
    if (!this.isDisposed && this.handle !== undefined) {
      dartsNative.destroyDictionary(this.handle);
      this.isDisposed = true;
    }
  }

  /**
   * Ensures the object has not been disposed
   * @throws {DartsError} if the object has been disposed
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new DartsError('Dictionary object has been disposed');
    }
  }
}

import Dictionary from './dictionary.js';
import { BuildError } from './errors.js';
import { dartsNative } from './native.js';
import type { BuildOptions } from './types.js';

/**
 * Darts Dictionary Builder class
 * A class for building Double-Array Trie
 */
export default class Builder {
  /**
   * Builds a Double-Array from keys and values
   * @param keys array of keys (preferably sorted in dictionary order)
   * @param values array of values (indices are used if omitted)
   * @param options build options
   * @returns the constructed Dictionary object
   * @throws {BuildError} if the build fails
   */
  // eslint-disable-next-line class-methods-use-this
  public build(inputKeys: string[], inputValues?: number[], options?: BuildOptions): Dictionary {
    Builder.validateInput(inputKeys, inputValues);

    let keys = inputKeys;
    let values = inputValues;

    // Sort keys (and values, if provided) together so the native side receives
    // properly aligned, dictionary-ordered input. The native build also sorts
    // defensively, but doing it here keeps the JS path consistent.
    if (!Builder.isSorted(keys)) {
      const pairs = keys.map((key, index) => ({
        key,
        value: values ? values[index] : index,
      }));

      pairs.sort((a, b) => {
        if (a.key < b.key) return -1;
        if (a.key > b.key) return 1;
        return 0;
      });

      keys = pairs.map((p) => p.key);
      values = inputValues ? pairs.map((p) => p.value) : undefined;
    }

    // Build is synchronous; report progress at start and end so callers that
    // wire up a progressCallback observe deterministic 0/total and total/total.
    const total = keys.length;
    options?.progressCallback?.(0, total);

    try {
      const handle = dartsNative.build(keys, values);
      options?.progressCallback?.(total, total);
      return new Dictionary(handle);
    } catch (error) {
      if (error instanceof BuildError) {
        throw error;
      }
      throw new BuildError(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Builds a Double-Array from keys and values, and saves it to a file asynchronously
   * @param keys array of keys (preferably sorted in dictionary order)
   * @param filePath destination file path
   * @param values array of values (indices are used if omitted)
   * @param options build options
   * @returns true if successful, false otherwise
   * @throws {BuildError} if the build fails
   */
  public async buildAndSave(
    keys: string[],
    filePath: string,
    values?: number[],
    options?: BuildOptions
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const result = this.buildAndSaveSync(keys, filePath, values, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Builds a Double-Array from keys and values, and saves it to a file synchronously
   * @param keys array of keys (preferably sorted in dictionary order)
   * @param filePath destination file path
   * @param values array of values (indices are used if omitted)
   * @param options build options
   * @returns true if successful, false otherwise
   * @throws {BuildError} if the build fails
   */
  public buildAndSaveSync(
    keys: string[],
    filePath: string,
    values?: number[],
    options?: BuildOptions
  ): boolean {
    const dictionary = this.build(keys, values, options);
    try {
      return dartsNative.saveDictionary(dictionary.getHandle(), filePath);
    } finally {
      dictionary.dispose();
    }
  }

  /**
   * Validates the input values
   * @param keys array of keys
   * @param values array of values
   * @throws {BuildError} if the input values are invalid
   */
  private static validateInput(keys: string[], values?: number[]): void {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new BuildError('Empty keys array');
    }

    keys.forEach((key) => {
      if (typeof key !== 'string') {
        throw new BuildError('All keys must be strings');
      }
    });

    if (values !== undefined) {
      if (!Array.isArray(values) || values.length !== keys.length) {
        throw new BuildError('Values array length must match keys array length');
      }

      values.forEach((value) => {
        if (typeof value !== 'number') {
          throw new BuildError('All values must be numbers');
        }
      });
    }
  }

  /**
   * Checks if an array is sorted (using byte-wise comparison to match the
   * native side's std::sort).
   * @param arr array to check
   * @returns true if sorted, false otherwise
   */
  private static isSorted(arr: string[]): boolean {
    for (let i = 1; i < arr.length; i += 1) {
      if (arr[i - 1] > arr[i]) {
        return false;
      }
    }
    return true;
  }
}

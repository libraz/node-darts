import { dartsNative } from './native';
import { Dictionary } from './dictionary';
import { BuildOptions } from './types';
import { BuildError } from './errors';

/**
 * Darts Dictionary Builder class
 * A class for building Double-Array Trie
 */
export class Builder {
  /**
   * Builds a Double-Array from keys and values
   * @param keys array of keys (preferably sorted in dictionary order)
   * @param values array of values (indices are used if omitted)
   * @param options build options
   * @returns the constructed Dictionary object
   * @throws {BuildError} if the build fails
   */
  public build(
    keys: string[],
    values?: number[],
    options?: BuildOptions
  ): Dictionary {
    this.validateInput(keys, values);
    
    // Sort keys
    if (!this.isSorted(keys)) {
      const sortedKeys = [...keys];
      const sortedValues = values ? [...values] : undefined;
      
      // Sort key-value pairs
      const pairs = sortedKeys.map((key, index) => ({
        key,
        value: sortedValues ? sortedValues[index] : index
      }));
      
      pairs.sort((a, b) => a.key.localeCompare(b.key));
      
      // Get keys and values after sorting
      for (let i = 0; i < pairs.length; i++) {
        sortedKeys[i] = pairs[i].key;
        if (sortedValues) {
          sortedValues[i] = pairs[i].value;
        }
      }
      
      keys = sortedKeys;
      values = sortedValues;
    }
    
    // If there is a progress callback, use a dummy implementation (progress callback is not supported in the current native implementation)
    if (options?.progressCallback) {
      const total = keys.length;
      let current = 0;
      const interval = setInterval(() => {
        current = Math.min(current + Math.floor(total / 10), total);
        options.progressCallback!(current, total);
        if (current >= total) {
          clearInterval(interval);
        }
      }, 100);
    }
    
    try {
      const handle = dartsNative.build(keys, values);
      return new Dictionary(handle, keys);
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
      const result = dartsNative.saveDictionary((dictionary as any).handle, filePath);
      return result;
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
  private validateInput(keys: string[], values?: number[]): void {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new BuildError('Empty keys array');
    }
    
    // Ensure keys are strings
    for (const key of keys) {
      if (typeof key !== 'string') {
        throw new BuildError('All keys must be strings');
      }
    }
    
    // Ensure values are numbers
    if (values !== undefined) {
      if (!Array.isArray(values) || values.length !== keys.length) {
        throw new BuildError('Values array length must match keys array length');
      }
      
      for (const value of values) {
        if (typeof value !== 'number') {
          throw new BuildError('All values must be numbers');
        }
      }
    }
  }

  /**
   * Checks if an array is sorted
   * @param arr array to check
   * @returns true if sorted, false otherwise
   */
  private isSorted(arr: string[]): boolean {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i - 1].localeCompare(arr[i]) > 0) {
        return false;
      }
    }
    return true;
  }
}
/**
 * node-darts: Node.js Native Addon for Darts (Double-ARray Trie System)
 * ESM wrapper for the native module
 *
 * @packageDocumentation
 */

import { DartsNative, TraverseCallback } from './core/types';
import { DartsError, FileNotFoundError, InvalidDictionaryError, BuildError } from './core/errors';

// Load native module using require
// Note: In a real ESM environment, we would use createRequire(import.meta.url)
// but for testing purposes, we're using require directly
// eslint-disable-next-line @typescript-eslint/no-require-imports
const native: DartsNative = require('bindings')('node_darts');

/**
 * Wrapper class for native module in ESM context
 * Adds error handling and provides a TypeScript-friendly interface
 */
export class DartsNativeWrapper implements DartsNative {
  /**
   * Creates a dictionary object
   * @returns dictionary handle
   */
  // eslint-disable-next-line class-methods-use-this
  createDictionary(): number {
    try {
      const handle = native.createDictionary();
      if (handle === null || handle === undefined) {
        throw new DartsError('Failed to create dictionary');
      }
      return handle;
    } catch (error) {
      if (error instanceof DartsError) {
        throw error;
      }
      throw new DartsError(
        `Failed to create dictionary: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Destroys a dictionary object
   * @param handle dictionary handle
   */
  // eslint-disable-next-line class-methods-use-this
  destroyDictionary(handle: number): void {
    try {
      native.destroyDictionary(handle);
    } catch (error) {
      throw new DartsError(
        `Failed to destroy dictionary: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Loads a dictionary file
   * @param handle dictionary handle
   * @param filePath path to the dictionary file
   * @returns true if successful, false otherwise
   */
  // eslint-disable-next-line class-methods-use-this
  loadDictionary(handle: number, filePath: string): boolean {
    try {
      const result = native.loadDictionary(handle, filePath);
      if (result === false) {
        throw new InvalidDictionaryError(`Failed to load dictionary from ${filePath}`);
      }
      return result;
    } catch (error) {
      if (error instanceof DartsError) {
        throw error;
      }
      // Detect file not found error from error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not found') || errorMessage.includes('No such file')) {
        throw new FileNotFoundError(filePath);
      }
      throw new InvalidDictionaryError(errorMessage);
    }
  }

  /**
   * Saves a dictionary file
   * @param handle dictionary handle
   * @param filePath destination file path
   * @returns true if successful, false otherwise
   */
  // eslint-disable-next-line class-methods-use-this
  saveDictionary(handle: number, filePath: string): boolean {
    try {
      const result = native.saveDictionary(handle, filePath);
      if (result === false) {
        throw new DartsError(`Failed to save dictionary to ${filePath}`);
      }
      return result;
    } catch (error) {
      if (error instanceof DartsError) {
        throw error;
      }
      throw new DartsError(
        `Failed to save dictionary: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Performs an exact match search
   * @param handle dictionary handle
   * @param key search key
   * @returns the corresponding value if found, -1 otherwise
   */
  // eslint-disable-next-line class-methods-use-this
  exactMatchSearch(handle: number, key: string): number {
    try {
      return native.exactMatchSearch(handle, key);
    } catch (error) {
      throw new DartsError(
        `Failed to perform exact match search: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Performs a common prefix search
   * @param handle dictionary handle
   * @param key search key
   * @returns array of found values
   */
  // eslint-disable-next-line class-methods-use-this
  commonPrefixSearch(handle: number, key: string): number[] {
    try {
      return native.commonPrefixSearch(handle, key);
    } catch (error) {
      throw new DartsError(
        `Failed to perform common prefix search: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Traverses the trie
   * @param handle dictionary handle
   * @param key search key
   * @param callback callback function
   */
  // eslint-disable-next-line class-methods-use-this
  traverse(handle: number, key: string, callback: TraverseCallback): void {
    try {
      native.traverse(handle, key, callback);
    } catch (error) {
      throw new DartsError(
        `Failed to traverse: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Builds a Double-Array
   * @param keys array of keys
   * @param values array of values (indices are used if omitted)
   * @returns dictionary handle
   */
  // eslint-disable-next-line class-methods-use-this
  build(keys: string[], values?: number[]): number {
    try {
      if (!Array.isArray(keys) || keys.length === 0) {
        throw new BuildError('Empty keys array');
      }

      // Ensure keys are strings
      keys.forEach((key) => {
        if (typeof key !== 'string') {
          throw new BuildError('All keys must be strings');
        }
      });

      // Ensure values are numbers
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

      const handle = native.build(keys, values);
      if (handle === null || handle === undefined) {
        throw new BuildError('Failed to build dictionary');
      }
      return handle;
    } catch (error) {
      if (error instanceof DartsError) {
        throw error;
      }
      throw new BuildError(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Gets the size of the dictionary
   * @param handle dictionary handle
   * @returns size of the dictionary
   */
  // eslint-disable-next-line class-methods-use-this
  size(handle: number): number {
    try {
      return native.size(handle);
    } catch (error) {
      throw new DartsError(
        `Failed to get dictionary size: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// Export singleton instance
export const dartsNative = new DartsNativeWrapper();

// Re-export default exports as named exports
export { default as Dictionary } from './core/dictionary';
export { default as Builder } from './core/builder';
export { default as TextDarts } from './text-darts';

// Re-export all other exports
export * from './core/types';
export * from './core/errors';
export * from './core/utils';

// Export factory functions
export {
  createDictionary,
  createBuilder,
  loadDictionary,
  buildDictionary,
  buildAndSaveDictionary,
  buildAndSaveDictionarySync,
} from './index';

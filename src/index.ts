/**
 * node-darts: Node.js Native Addon for Darts (Double-ARray Trie System)
 *
 * This package binds the C++ version of Darts, making .darts dictionary files
 * available in Node.js/TypeScript environments.
 *
 * @packageDocumentation
 */

// Import classes
import Dictionary from './core/dictionary';
import Builder from './core/builder';
import TextDarts from './text-darts';

// Import type definitions
// import { TraverseResult, TraverseCallback, BuildOptions, WordReplacer } from './core/types';
import { BuildOptions } from './core/types';
/*
// Import error classes
import { DartsError, FileNotFoundError, InvalidDictionaryError, BuildError } from './core/errors';

// Import utility functions
import {
  fileExists,
  validateFilePath,
  ensureDirectoryExists,
  sortStrings,
  uniqueArray,
  sortAndUniqueStrings,
} from './core/utils';
*/

// Export classes
export { default as Dictionary } from './core/dictionary';
export { default as Builder } from './core/builder';
export { default as TextDarts } from './text-darts';

// Export type definitions
export { TraverseResult, TraverseCallback, BuildOptions, WordReplacer } from './core/types';

// Export error classes
export { DartsError, FileNotFoundError, InvalidDictionaryError, BuildError } from './core/errors';

// Export utility functions
export {
  fileExists,
  validateFilePath,
  ensureDirectoryExists,
  sortStrings,
  uniqueArray,
  sortAndUniqueStrings,
} from './core/utils';

/**
 * Creates a dictionary
 * @returns a new Dictionary object
 * @example
 * ```typescript
 * import { createDictionary } from 'node-darts';
 *
 * const dict = createDictionary();
 * dict.loadSync('/path/to/dictionary.darts');
 * const result = dict.exactMatchSearch('hello');
 * ```
 */
export function createDictionary(): Dictionary {
  return new Dictionary();
}

/**
 * Creates a builder
 * @returns a new Builder object
 * @example
 * ```typescript
 * import { createBuilder } from 'node-darts';
 *
 * const builder = createBuilder();
 * const keys = ['apple', 'banana', 'orange'];
 * const dict = builder.build(keys);
 * ```
 */
export function createBuilder(): Builder {
  return new Builder();
}

/**
 * Loads a dictionary file
 * @param filePath path to the dictionary file
 * @returns the loaded Dictionary object
 * @throws {FileNotFoundError} if the file is not found
 * @throws {InvalidDictionaryError} if the dictionary file is invalid
 * @example
 * ```typescript
 * import { loadDictionary } from 'node-darts';
 *
 * const dict = loadDictionary('/path/to/dictionary.darts');
 * const result = dict.exactMatchSearch('hello');
 * ```
 */
export function loadDictionary(filePath: string): Dictionary {
  const dict = new Dictionary();
  dict.loadSync(filePath);
  return dict;
}

/**
 * Builds a dictionary from keys and values
 * @param keys array of keys
 * @param values array of values (indices are used if omitted)
 * @param options build options
 * @returns the constructed Dictionary object
 * @example
 * ```typescript
 * import { buildDictionary } from 'node-darts';
 *
 * const keys = ['apple', 'banana', 'orange'];
 * const values = [1, 2, 3];
 * const dict = buildDictionary(keys, values);
 * ```
 */
export function buildDictionary(
  keys: string[],
  values?: number[],
  options?: BuildOptions
): Dictionary {
  const builder = new Builder();
  return builder.build(keys, values, options);
}

/**
 * Builds a dictionary from keys and values and saves it to a file
 * @param keys array of keys
 * @param filePath destination file path
 * @param values array of values (indices are used if omitted)
 * @param options build options
 * @returns true if successful, false otherwise
 * @example
 * ```typescript
 * import { buildAndSaveDictionary } from 'node-darts';
 *
 * const keys = ['apple', 'banana', 'orange'];
 * const values = [1, 2, 3];
 * const result = await buildAndSaveDictionary(keys, '/path/to/output.darts', values);
 * ```
 */
export async function buildAndSaveDictionary(
  keys: string[],
  filePath: string,
  values?: number[],
  options?: BuildOptions
): Promise<boolean> {
  return TextDarts.buildAndSave(keys, filePath, values, options);
}

/**
 * Builds a dictionary from keys and values and saves it to a file synchronously
 * @param keys array of keys
 * @param filePath destination file path
 * @param values array of values (indices are used if omitted)
 * @param options build options
 * @returns true if successful, false otherwise
 * @example
 * ```typescript
 * import { buildAndSaveDictionarySync } from 'node-darts';
 *
 * const keys = ['apple', 'banana', 'orange'];
 * const values = [1, 2, 3];
 * const result = buildAndSaveDictionarySync(keys, '/path/to/output.darts', values);
 * ```
 */
export function buildAndSaveDictionarySync(
  keys: string[],
  filePath: string,
  values?: number[],
  options?: BuildOptions
): boolean {
  return TextDarts.buildAndSaveSync(keys, filePath, values, options);
}

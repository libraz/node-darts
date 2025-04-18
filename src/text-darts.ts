/**
 * TextDarts class - A class-based interface similar to Perl's Text::Darts
 *
 * This class provides a class-based interface similar to Perl's Text::Darts module.
 * It internally uses the Dictionary and Builder classes.
 */

import * as fs from 'fs';
import Dictionary from './core/dictionary';
import Builder from './core/builder';
import { WordReplacer, TraverseCallback, BuildOptions } from './core/types';
import { dartsNative } from './core/native';
import { FileNotFoundError } from './core/errors';

// FinalizationRegistry for automatic resource cleanup
const registry = new FinalizationRegistry((handle: number) => {
  // Clean up native resources when object is garbage collected
  if (handle !== undefined) {
    dartsNative.destroyDictionary(handle);
  }
});

/**
 * TextDarts class - A class-based interface similar to Perl's Text::Darts
 */
export default class TextDarts {
  private dictionary: Dictionary;

  private words: string[];

  private isDisposed: boolean;

  /**
   * Private constructor - use static methods instead
   * @param dictionary Dictionary object
   * @param words Array of words
   */
  private constructor(dictionary: Dictionary, words: string[]) {
    this.dictionary = dictionary;
    this.words = words;
    this.isDisposed = false;

    // Register for automatic cleanup when garbage collected
    registry.register(this, dictionary.getHandle(), this);
  }

  /**
   * Creates a new TextDarts object
   * @param source Array of words or path to a dictionary file
   * @param values Optional array of values
   * @returns A new TextDarts object
   */
  public static new(source: string[] | string, values?: number[]): TextDarts {
    if (Array.isArray(source)) {
      return TextDarts.build(source, values);
    }
    return TextDarts.load(source);
  }

  /**
   * Creates a new TextDarts object from a word list
   * @param keys Array of words
   * @param values Optional array of values
   * @param options Optional build options
   * @returns A new TextDarts object
   */
  public static build(keys: string[], values?: number[], options?: BuildOptions): TextDarts {
    const builder = new Builder();
    const dictionary = builder.build(keys, values, options);
    return new TextDarts(dictionary, keys);
  }

  /**
   * Creates a new TextDarts object from a dictionary file
   * @param filePath Path to the dictionary file
   * @returns A new TextDarts object
   */
  public static load(filePath: string): TextDarts {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new FileNotFoundError(filePath);
    }

    const dictionary = new Dictionary();
    dictionary.loadSync(filePath);
    // Note: We don't have the original words in this case
    // This will limit the functionality of replaceWords
    return new TextDarts(dictionary, []);
  }

  /**
   * Builds a dictionary and saves it to a file
   * @param keys Array of words
   * @param filePath Path to save the dictionary
   * @param values Optional array of values
   * @param options Optional build options
   * @returns Promise that resolves to true if successful
   */
  public static async buildAndSave(
    keys: string[],
    filePath: string,
    values?: number[],
    options?: BuildOptions
  ): Promise<boolean> {
    const builder = new Builder();
    return builder.buildAndSave(keys, filePath, values, options);
  }

  /**
   * Builds a dictionary and saves it to a file synchronously
   * @param keys Array of words
   * @param filePath Path to save the dictionary
   * @param values Optional array of values
   * @param options Optional build options
   * @returns True if successful
   */
  public static buildAndSaveSync(
    keys: string[],
    filePath: string,
    values?: number[],
    options?: BuildOptions
  ): boolean {
    const builder = new Builder();
    return builder.buildAndSaveSync(keys, filePath, values, options);
  }

  /**
   * Searches for dictionary words in a text and replaces them
   * @param text The text to search in
   * @param replacer The replacement method (function or object)
   * @returns The text after replacement
   */
  public replaceWords(text: string, replacer: WordReplacer): string {
    this.ensureNotDisposed();
    return this.dictionary.replaceWords(text, replacer);
  }

  /**
   * Performs an exact match search
   * @param key The key to search for
   * @returns The value if found, -1 otherwise
   */
  public exactMatchSearch(key: string): number {
    this.ensureNotDisposed();
    return this.dictionary.exactMatchSearch(key);
  }

  /**
   * Performs a common prefix search
   * @param key The key to search for
   * @returns Array of values
   */
  public commonPrefixSearch(key: string): number[] {
    this.ensureNotDisposed();
    return this.dictionary.commonPrefixSearch(key);
  }

  /**
   * Traverses the trie
   * @param key The key to start traversal from
   * @param callback The callback function
   */
  public traverse(key: string, callback: TraverseCallback): void {
    this.ensureNotDisposed();
    this.dictionary.traverse(key, callback);
  }

  /**
   * Loads a dictionary file asynchronously
   * @param filePath Path to the dictionary file
   * @returns Promise that resolves to true if successful
   */
  public async load(filePath: string): Promise<boolean> {
    this.ensureNotDisposed();
    const result = await this.dictionary.load(filePath);
    // Note: We don't have the original words in this case
    // This will limit the functionality of replaceWords
    return result;
  }

  /**
   * Loads a dictionary file synchronously
   * @param filePath Path to the dictionary file
   * @returns True if successful
   */
  public loadSync(filePath: string): boolean {
    this.ensureNotDisposed();
    const result = this.dictionary.loadSync(filePath);
    // Note: We don't have the original words in this case
    // This will limit the functionality of replaceWords
    return result;
  }

  /**
   * Gets the size of the dictionary
   * @returns The size of the dictionary
   */
  public size(): number {
    this.ensureNotDisposed();

    // If we have words array, return its size
    if (this.words && this.words.length > 0) {
      return this.words.length;
    }
    // Otherwise fall back to dictionary size
    return this.dictionary.size();
  }

  /**
   * Ensures the object is not disposed
   * @throws Error if the object is disposed
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('TextDarts object has been disposed');
    }
  }

  /**
   * Releases resources (optional, resources will be automatically released when the object is garbage collected)
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // Explicitly release resources
    this.dictionary.dispose();

    // Unregister from FinalizationRegistry
    registry.unregister(this);

    // Mark as disposed
    this.isDisposed = true;
  }

  /**
   * Gets the underlying Dictionary object
   * @returns The Dictionary object
   * @internal
   */
  // eslint-disable-next-line no-underscore-dangle
  get _dictionary(): Dictionary {
    this.ensureNotDisposed();
    return this.dictionary;
  }
}

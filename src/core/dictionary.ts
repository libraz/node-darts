import { dartsNative } from './native';
import { TraverseCallback, TraverseResult, WordReplacer } from './types';
import { DartsError } from './errors';

/**
 * Darts Dictionary class
 * Provides dictionary search using Double-Array Trie
 */
export class Dictionary {
  private handle: number;
  private isDisposed: boolean;
  private words: string[];

  /**
   * Constructor
   * @param handle Dictionary handle (optional)
   * @param words Array of words (optional)
   */
  constructor(handle?: number, words?: string[]) {
    this.handle = handle !== undefined ? handle : dartsNative.createDictionary();
    this.isDisposed = false;
    this.words = words || [];
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
   * Performs an exact match search
   * @param key search key
   * @returns the corresponding value if found, -1 otherwise
   * @throws {DartsError} if the search fails
   */
  public exactMatchSearch(key: string): number {
    this.ensureNotDisposed();
    
    // Return -1 if the dictionary is empty
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
    
    // Return an empty array if the dictionary is empty
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
   * @returns true if successful, false otherwise
   * @throws {FileNotFoundError} if the file is not found
   * @throws {InvalidDictionaryError} if the dictionary file is invalid
   */
  public async load(filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const result = this.loadSync(filePath);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Loads a dictionary file synchronously
   * @param filePath path to the dictionary file
   * @returns true if successful, false otherwise
   * @throws {FileNotFoundError} if the file is not found
   * @throws {InvalidDictionaryError} if the dictionary file is invalid
   */
  public loadSync(filePath: string): boolean {
    this.ensureNotDisposed();
    return dartsNative.loadDictionary(this.handle, filePath);
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
    
    let result = '';
    let position = 0;
    
    while (position < text.length) {
      let matchFound = false;
      
      // Try to match words at the current position
      for (let len = Math.min(50, text.length - position); len > 0; len--) {
        const word = text.substring(position, position + len);
        const value = this.exactMatchSearch(word);
        
        if (value !== -1) {
          // Word found in dictionary
          let replacement;
          if (typeof replacer === 'function') {
            // If it's a callback function
            replacement = replacer(word);
          } else {
            // If it's a replacement map (object)
            replacement = replacer[word] || word;
          }
          
          result += replacement;
          position += len;
          matchFound = true;
          break;
        }
      }
      
      if (!matchFound) {
        // No match found, advance by 1 character
        result += text[position];
        position++;
      }
    }
    
    return result;
  }

  /**
   * Gets a word by its value
   * @param value The value to look up
   * @returns The corresponding word or undefined if not found
   */
  private getWordByValue(value: number): string | undefined {
    if (this.words.length > value && value >= 0) {
      return this.words[value];
    }
    return undefined;
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
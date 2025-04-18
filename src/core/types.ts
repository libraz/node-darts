/**
 * Interface representing the result of traversing a Trie
 */
export interface TraverseResult {
  /** node position */
  node: number;
  /** key position */
  key: number;
  /** value */
  value: number;
}

/**
 * Type for traverse callback function
 * @returns true to continue processing, false to abort
 */
export type TraverseCallback = (result: TraverseResult) => boolean | void;

/**
 * Word replacement function or mapping
 * Used for replacing words in text
 */
export type WordReplacer = ((match: string) => string) | Record<string, string>;

/**
 * Interface for build options
 */
export interface BuildOptions {
  /** progress callback function */
  progressCallback?: (current: number, total: number) => void;
}

/**
 * Interface for native module
 * This interface is for internal implementation and is not intended to be used directly
 */
export interface DartsNative {
  /** Creates a dictionary object */
  createDictionary(): number;
  /** Destroys a dictionary object */
  destroyDictionary(handle: number): void;
  /** Loads a dictionary file */
  loadDictionary(handle: number, filePath: string): boolean;
  /** Saves a dictionary file */
  saveDictionary(handle: number, filePath: string): boolean;
  /** Performs an exact match search */
  exactMatchSearch(handle: number, key: string): number;
  /** Performs a common prefix search */
  commonPrefixSearch(handle: number, key: string): number[];
  /** Traverses the trie */
  traverse(handle: number, key: string, callback: TraverseCallback): void;
  /** Builds a Double-Array */
  build(keys: string[], values?: number[]): number;
  /** Gets the size of the dictionary */
  size(handle: number): number;
}
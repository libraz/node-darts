/**
 * Backend kind: 'darts' holds the dictionary in the taku910 Darts 0.32 layout,
 * 'clone' in the darts-clone layout. Both are built into the WebAssembly core,
 * and files are interchangeable with those written by the C++ libraries.
 */
export type Backend = 'darts' | 'clone';

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
export type TraverseCallback = (result: TraverseResult) => boolean | undefined;

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
  /** backend to build with (defaults to 'darts' / taku910 for back-compat) */
  backend?: Backend;
}

/**
 * Interface for dictionary load options
 */
export interface LoadOptions {
  /**
   * Backend to load with. If omitted, the loader auto-detects by trying
   * darts-clone first (it validates strictly) and falling back to taku910/darts
   * on rejection.
   */
  backend?: Backend;
}

/**
 * Interface for the core module
 * This interface is for internal implementation and is not intended to be used directly
 */
export interface DartsNative {
  /** Creates a dictionary object */
  createDictionary(backend?: Backend): number;
  /** Destroys a dictionary object */
  destroyDictionary(handle: number): void;
  /** Loads a dictionary file */
  loadDictionary(handle: number, filePath: string, backend?: Backend): boolean;
  /** Loads a dictionary file without blocking while it is read */
  loadDictionaryAsync(handle: number, filePath: string, backend?: Backend): Promise<boolean>;
  /** Saves a dictionary file */
  saveDictionary(handle: number, filePath: string): boolean;
  /** Performs an exact match search */
  exactMatchSearch(handle: number, key: string): number;
  /** Performs a common prefix search */
  commonPrefixSearch(handle: number, key: string): number[];
  /** Traverses the trie */
  traverse(handle: number, key: string, callback: TraverseCallback): void;
  /** Builds a Double-Array */
  build(keys: string[], values?: number[], backend?: Backend): number;
  /** Gets the size of the dictionary */
  size(handle: number): number;
  /** Returns the backend kind currently held by the handle */
  getBackend(handle: number): Backend;
}

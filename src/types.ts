/**
 * Double-array layout of a dictionary.
 *
 * - `'darts'`: Darts 0.32, the format written by the original Darts library
 *   and the tools built on it. The default for {@link Dictionary.build}.
 * - `'clone'`: darts-clone, a more compact layout.
 *
 * Loading detects the layout from the bytes unless one is requested.
 */
export type Backend = 'darts' | 'clone';

/** The `code` of every {@link DartsError}. */
export type DartsErrorCode =
  | 'ERR_DARTS_FILE_NOT_FOUND'
  | 'ERR_DARTS_INVALID_DICTIONARY'
  | 'ERR_DARTS_BUILD_FAILED'
  | 'ERR_DARTS_DISPOSED'
  | 'ERR_DARTS_IO';

/**
 * Keys for {@link Dictionary.build}: either strings, each valued by its
 * input-order index, or `[key, value]` pairs such as a `Map`. One input uses
 * one form throughout.
 */
export type BuildInput = Iterable<string> | Iterable<readonly [string, number]>;

/** Options for {@link Dictionary.build}. */
export interface BuildOptions {
  /** Layout to build; `'darts'` when omitted. */
  readonly backend?: Backend;
}

/** Options for {@link Dictionary.load}, {@link Dictionary.loadSync} and {@link Dictionary.fromBytes}. */
export interface LoadOptions {
  /** Layout to read the bytes as; detected from the bytes when omitted. */
  readonly backend?: Backend;
}

/** One key found at the start of the text by {@link Dictionary.commonPrefixSearch}. */
export interface PrefixMatch {
  /** Value of the matched key. */
  readonly value: number;
  /** Length of the match in UTF-16 code units: `text.slice(0, length)` is the key. */
  readonly length: number;
}

/** The trie state after one character of {@link Dictionary.traverse}. */
export interface TraverseStep {
  /** UTF-16 length of the text consumed so far. */
  readonly length: number;
  /** Value of the key ending here, or `undefined` if no key ends here. */
  readonly value: number | undefined;
}

/**
 * Replacement for {@link Dictionary.replaceWords}: a function receiving the
 * matched text and its value, a `Map`, or an object whose own properties map
 * matched text to its replacement. A match a `Map` or object does not cover is
 * left as is.
 */
export type WordReplacer =
  | ((match: string, value: number) => string)
  | ReadonlyMap<string, string>
  | Readonly<Record<string, string>>;

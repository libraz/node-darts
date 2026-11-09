/**
 * Darts (Double-ARray Trie System) for Node.js, compiled to WebAssembly.
 *
 * @packageDocumentation
 */

export { Dictionary } from './dictionary.js';
export { BuildError, DartsError, FileNotFoundError, InvalidDictionaryError } from './errors.js';
export type {
  Backend,
  BuildInput,
  BuildOptions,
  DartsErrorCode,
  LoadOptions,
  PrefixMatch,
  TraverseStep,
  WordReplacer,
} from './types.js';

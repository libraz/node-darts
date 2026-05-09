/**
 * node-darts: Node.js Native Addon for Darts (Double-ARray Trie System)
 * ESM wrapper for the native module
 *
 * Re-exports the same surface as ./index. The native loader (with the Windows
 * CI fallback) lives in ./core/native and is shared by both entry points.
 *
 * @packageDocumentation
 */

export { default as Builder } from './core/builder.js';

export { default as Dictionary } from './core/dictionary.js';
export * from './core/errors.js';
export { DartsNativeWrapper, dartsNative } from './core/native.js';

export * from './core/types.js';
export * from './core/utils.js';
export {
  buildAndSaveDictionary,
  buildAndSaveDictionarySync,
  buildDictionary,
  createBuilder,
  createDictionary,
  loadDictionary,
} from './index.js';
export { default as TextDarts } from './text-darts.js';

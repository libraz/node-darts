/**
 * node-darts: Node.js Native Addon for Darts (Double-ARray Trie System)
 * ESM wrapper for the native module
 *
 * Re-exports the same surface as ./index. The native loader (with the Windows
 * CI fallback) lives in ./core/native and is shared by both entry points.
 *
 * @packageDocumentation
 */

export { default as Builder } from './core/builder';

export { default as Dictionary } from './core/dictionary';
export * from './core/errors';
export { DartsNativeWrapper, dartsNative } from './core/native';

export * from './core/types';
export * from './core/utils';
export {
  buildAndSaveDictionary,
  buildAndSaveDictionarySync,
  buildDictionary,
  createBuilder,
  createDictionary,
  loadDictionary,
} from './index';
export { default as TextDarts } from './text-darts';

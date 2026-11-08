/**
 * node-darts: Darts (Double-ARray Trie System) for Node.js, compiled to WebAssembly
 * ESM entry point
 *
 * Re-exports the same surface as ./index. The WebAssembly core is instantiated
 * once in ./core/wasm and shared by both entry points.
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

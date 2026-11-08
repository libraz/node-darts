# node-darts

Darts (Double-ARray Trie System) for Node.js, compiled to WebAssembly

[![CI](https://img.shields.io/github/actions/workflow/status/libraz/node-darts/ci.yml?branch=main&label=CI)](https://github.com/libraz/node-darts/actions)
[![npm](https://img.shields.io/npm/v/node-darts)](https://www.npmjs.com/package/node-darts)
[![codecov](https://codecov.io/gh/libraz/node-darts/branch/main/graph/badge.svg)](https://codecov.io/gh/libraz/node-darts)
[![License](https://img.shields.io/badge/license-MIT-blue)](https://github.com/libraz/node-darts/blob/main/LICENSE)

## Overview

`node-darts` brings the Darts (Double-ARray Trie System) dictionary to Node.js/TypeScript. The trie core is written in Rust and compiled to WebAssembly, so the package installs the same way on every platform: no compiler, no prebuilt binary download, no install script. Dictionary files are byte-compatible with those written by the C++ Darts and darts-clone libraries.

## Features

- Load and use `.darts` dictionary files created by Perl's `Text::Darts`
- Build dictionaries from key-value pairs
- Fast exact match search and common prefix search
- Text replacement using dictionary words
- Traverse the trie structure
- Asynchronous and synchronous APIs
- TypeScript support
- ESModule and CommonJS support
- Class-based interface similar to Perl's `Text::Darts`
- Two on-disk formats (Darts 0.32 and darts-clone) selectable per dictionary

## Installation

```bash
npm install node-darts
# or
yarn add node-darts
```

## Requirements

- Node.js v20.0.0 or later

Nothing else: the WebAssembly module is embedded in the package and runs on any OS and CPU architecture Node.js supports.

## Basic Usage

```javascript
// Using ESM
import { loadDictionary, TextDarts } from 'node-darts';

// Using CommonJS
// const { loadDictionary, TextDarts } = require('node-darts');

// Load an existing dictionary file
const dict = loadDictionary('/path/to/dictionary.darts');

// Text replacement using the loaded dictionary
const text = 'I like apple and pineapple for breakfast.';
const replaced = dict.replaceWords(text, (word) => `<b>${word}</b>`);
console.log(replaced); // "I like <b>apple</b> and <b>pineapple</b> for breakfast."

// You can also use an object mapping for replacement
const mapping = {
  apple: '🍎',
  pineapple: '🍍',
};
const replaced2 = dict.replaceWords(text, mapping);
console.log(replaced2); // "I like 🍎 and 🍍 for breakfast."

// Exact match search
console.log(dict.exactMatchSearch('apple')); // Returns the value if found
console.log(dict.exactMatchSearch('grape')); // -1 (not found)

// Common prefix search
const results = dict.commonPrefixSearch('pineapple');
console.log(results); // Array of found values

// Clean up resources
dict.dispose();

// Alternative: Using TextDarts class
const darts = TextDarts.load('/path/to/dictionary.darts');
const replaced3 = darts.replaceWords(text, mapping);
console.log(replaced3); // "I like 🍎 and 🍍 for breakfast."
darts.dispose();
```

## Creating a Dictionary

If you don't have a dictionary file yet, you can create one:

```javascript
import { buildDictionary, buildAndSaveDictionary } from 'node-darts';

// Create a dictionary from keys and values
const keys = ['apple', 'banana', 'orange', 'pineapple', 'strawberry'];
const values = [100, 200, 300, 400, 500];

// Build in memory
const dict = buildDictionary(keys, values);

// Or build and save to a file
await buildAndSaveDictionary(keys, '/path/to/output.darts', values);
```

## API Reference

### Dictionary Class

- `exactMatchSearch(key: string): number` - Performs an exact match search
- `commonPrefixSearch(key: string): number[]` - Performs a common prefix search
- `replaceWords(text: string, replacer: WordReplacer): string` - Searches for dictionary words in a text and replaces them
- `traverse(key: string, callback: TraverseCallback): void` - Traverses the trie
- `load(filePath: string): Promise<boolean>` - Loads a dictionary file asynchronously
- `loadSync(filePath: string): boolean` - Loads a dictionary file synchronously
- `size(): number` - Gets the size of the dictionary
- `dispose(): void` - Releases resources

### Builder Class

- `build(keys: string[], values?: number[], options?: BuildOptions): Dictionary` - Builds a Double-Array
- `buildAndSave(keys: string[], filePath: string, values?: number[], options?: BuildOptions): Promise<boolean>` - Builds and saves asynchronously
- `buildAndSaveSync(keys: string[], filePath: string, values?: number[], options?: BuildOptions): boolean` - Builds and saves synchronously

### TextDarts Class

The TextDarts class provides a class-based interface similar to Perl's Text::Darts module. It offers a more object-oriented approach to working with dictionaries and includes automatic resource management through JavaScript's garbage collection.

> **Note:** TextDarts class uses the Factory Method pattern and cannot be instantiated directly with `new TextDarts()`. Instead, use the static factory methods (`TextDarts.build()`, `TextDarts.load()`, or `TextDarts.new()`) to create instances. This design choice helps encapsulate the complexity of object creation, allows for runtime determination of object types, centralizes validation logic, and makes future changes to the creation process easier.

#### Static Methods

- `static new(source: string[] | string, values?: number[]): TextDarts` - Creates a new TextDarts object from words or a dictionary file
- `static build(keys: string[], values?: number[], options?: BuildOptions): TextDarts` - Creates a new TextDarts object from a word list
- `static load(filePath: string): TextDarts` - Creates a new TextDarts object from a dictionary file
- `static buildAndSave(keys: string[], filePath: string, values?: number[], options?: BuildOptions): Promise<boolean>` - Builds and saves a dictionary asynchronously
- `static buildAndSaveSync(keys: string[], filePath: string, values?: number[], options?: BuildOptions): boolean` - Builds and saves a dictionary synchronously

#### Instance Methods

- `replaceWords(text: string, replacer: WordReplacer): string` - Searches for dictionary words in a text and replaces them
- `exactMatchSearch(key: string): number` - Performs an exact match search
- `commonPrefixSearch(key: string): number[]` - Performs a common prefix search
- `traverse(key: string, callback: TraverseCallback): void` - Traverses the trie
- `load(filePath: string): Promise<boolean>` - Loads a dictionary file asynchronously
- `loadSync(filePath: string): boolean` - Loads a dictionary file synchronously
- `size(): number` - Gets the size of the dictionary
- `dispose(): void` - Releases resources (optional, resources will be automatically released when the object is garbage collected)

### Helper Functions

- `createDictionary(): Dictionary` - Creates a new Dictionary object
- `loadDictionary(filePath: string): Dictionary` - Loads a dictionary from a file
- `buildDictionary(keys: string[], values?: number[], options?: BuildOptions): Dictionary` - Builds a dictionary from keys and values
- `buildAndSaveDictionary(keys: string[], filePath: string, values?: number[], options?: BuildOptions): Promise<boolean>` - Builds and saves a dictionary asynchronously
- `buildAndSaveDictionarySync(keys: string[], filePath: string, values?: number[], options?: BuildOptions): boolean` - Builds and saves a dictionary synchronously

### WordReplacer Type

The `WordReplacer` type can be either:

1. A function that takes a matched word and returns a replacement string:

   ```typescript
   (match: string) => string;
   ```

2. An object mapping words to their replacements:
   ```typescript
   Record<string, string>;
   ```

### Build Options

- `progressCallback?: (current: number, total: number) => void` - Callback function for build progress

## Examples

See the [examples](./examples) directory for more usage examples:

- [Basic Usage](./examples/basic-usage.js)
- [Dictionary Builder](./examples/dictionary-builder.js)
- [Text Replacement](./examples/text-replacement.js)
- [Auto-Complete](./examples/auto-complete.js)
- [Error Handling](./examples/error-handling.js)
- [Morphological Analysis](./examples/morphological-analysis.js)

### Text Replacement Example

The `replaceWords` method allows you to search for dictionary words in a text and replace them with custom values. This is useful for tasks like:

- Text normalization
- Entity recognition and highlighting
- Content filtering
- Simple morphological analysis

```javascript
import { buildDictionary } from 'node-darts';

// Create a dictionary
const keys = ['apple', 'banana', 'orange', 'pineapple'];
const values = [1, 2, 3, 4];
const dict = buildDictionary(keys, values);

// Replace words in text using a function
const text = 'I like apple and pineapple.';
const replaced = dict.replaceWords(text, (word) => `${word.toUpperCase()}`);
console.log(replaced); // "I like APPLE and PINEAPPLE."

// Replace words using an object mapping
const mapping = {
  apple: 'red apple',
  pineapple: 'yellow pineapple',
};
const replaced2 = dict.replaceWords(text, mapping);
console.log(replaced2); // "I like red apple and yellow pineapple."

// Clean up resources
dict.dispose();
```

### TextDarts Class Example

The TextDarts class provides a more object-oriented approach and includes automatic resource management:

```javascript
import { TextDarts } from 'node-darts';

// Create a TextDarts object from a word list
const keys = ['apple', 'banana', 'orange', 'pineapple'];
const values = [1, 2, 3, 4];
const darts = TextDarts.build(keys, values);

// Perform searches
console.log(darts.exactMatchSearch('apple')); // 1
console.log(darts.commonPrefixSearch('pineapple')); // [1, 4]

// Replace words in text
const text = 'I like apple and pineapple.';
const replaced = darts.replaceWords(text, (word) => `${word.toUpperCase()}`);
console.log(replaced); // "I like APPLE and PINEAPPLE."

// Resources will be automatically released when the object is garbage collected
// But you can explicitly release them if needed
darts.dispose();

// Load an existing dictionary file
const loadedDarts = TextDarts.load('/path/to/dictionary.darts');
console.log(loadedDarts.exactMatchSearch('apple')); // Returns the value if found
```

### Advanced Usage: Text Replacement with Context

You can use the `replaceWords` method for more advanced text processing:

```javascript
import { TextDarts } from 'node-darts';

// Create a dictionary with terms to highlight
const terms = ['JavaScript', 'TypeScript', 'Node.js', 'Darts', 'Trie'];
const darts = TextDarts.build(terms);

// Text to process
const article = `
Node.js applications can be written in JavaScript or TypeScript.
This library uses the Darts algorithm to implement a Trie structure.
`;

// Replace with HTML tags for highlighting
const highlighted = darts.replaceWords(article, (term) => {
  return `<span class="highlight">${term}</span>`;
});

console.log(highlighted);
// Output:
// <span class="highlight">Node.js</span> applications can be written in <span class="highlight">JavaScript</span> or <span class="highlight">TypeScript</span>.
// This library uses the <span class="highlight">Darts</span> algorithm to implement a <span class="highlight">Trie</span> structure.

// Clean up resources (optional)
darts.dispose();
```

## Backends (Darts vs darts-clone)

Both double-array layouts are built into the WebAssembly core, so callers can
pick between them per dictionary via a `backend` option:

- `'darts'` (default) — the original Darts 0.32 format
- `'clone'` — the more compact `darts-clone` format

Files are byte-compatible with those written by the corresponding C++ library,
in both directions.

```javascript
// Build with explicit backend
const dict = buildDictionary(keys, values, { backend: 'clone' });

// Save and reload — auto-detect picks the right backend
const file = '/tmp/dict.darts';
buildAndSaveDictionarySync(keys, file, values, { backend: 'clone' });
const reloaded = loadDictionary(file);
console.log(reloaded.getBackend()); // 'clone'

// Force a specific backend on load (skips auto-detect)
const explicit = loadDictionary(file, { backend: 'clone' });
```

When `loadDictionary(path)` is called without an explicit `backend`, the loader
probes `darts-clone` first (it validates the on-disk format strictly) and falls
back to taku910 on rejection. Pass `{ backend }` explicitly to skip detection.

The public API is identical for both, but a few behaviours differ:

- **On-disk format is NOT compatible.** A `.darts` file built with one backend
  cannot be loaded by the other.
- `darts-clone` rejects zero-length keys at build time; the original silently
  accepts them.
- `darts-clone` rejects malformed dictionary files at load time; the Darts
  format has no header to validate, so it accepts any file (searches on a
  malformed one return misses rather than crashing). Auto-detect tries clone
  first for that reason.

Use `dict.getBackend()` (or `TextDarts#getBackend()`) to introspect which
backend a dictionary is currently using.

## Error Handling

The library provides the following custom error classes:

- `DartsError` - Base error class
- `FileNotFoundError` - Thrown when a file is not found
- `InvalidDictionaryError` - Thrown when an invalid dictionary file is encountered
- `BuildError` - Thrown when dictionary building fails

## License

The `node-darts` project itself is released under the MIT License (see [LICENSE](./LICENSE)).

The WebAssembly core is a Rust port of two libraries that keep their original licenses:

- **Darts** (Taku Kudo) — dual-licensed under the BSD License or LGPL; the port is distributed under the BSD License.
- **darts-clone** (Susumu Yata) — BSD 2-Clause License.

Their copyright notices and license texts are reproduced in [NOTICE](./NOTICE).

## Acknowledgements

The trie core ports two libraries:

- [Darts (Double-ARray Trie System)](http://chasen.org/~taku/software/darts/) by Taku Kudo, distributed under the BSD License or LGPL.
- [darts-clone](https://github.com/s-yata/darts-clone) by Susumu Yata, distributed under the BSD 2-Clause License.

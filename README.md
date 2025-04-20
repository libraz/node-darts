# node-darts

Node.js Native Addon for Darts (Double-ARray Trie System)

[![npm version](https://badge.fury.io/js/node-darts.svg)](https://badge.fury.io/js/node-darts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/libraz/node-darts/actions/workflows/ci.yml/badge.svg)](https://github.com/libraz/node-darts/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/libraz/node-darts/branch/main/graph/badge.svg)](https://codecov.io/gh/libraz/node-darts)

## Overview

`node-darts` is a Node.js native addon that provides bindings to the C++ Darts (Double-ARray Trie System) library. It allows you to use `.darts` dictionary files in Node.js/TypeScript environments with high performance.

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

## Installation

```bash
npm install node-darts
# or
yarn add node-darts
```

## Requirements

- Node.js v20.0.0 or later
- C++ compiler with C++17 support

### Windows-specific Requirements

If you're on Windows, you'll need:

- Visual Studio Build Tools with C++ workload
- Python 2.7 or 3.x

The package will attempt to install these dependencies automatically during installation if they're missing. If automatic installation fails, you can install them manually:

1. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload
2. Install [Python](https://www.python.org/downloads/) (2.7 or 3.x)
3. Set the npm config: `npm config set msvs_version 2019`

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

## Error Handling

The library provides the following custom error classes:

- `DartsError` - Base error class
- `FileNotFoundError` - Thrown when a file is not found
- `InvalidDictionaryError` - Thrown when an invalid dictionary file is encountered
- `BuildError` - Thrown when dictionary building fails

## License

MIT

## Acknowledgements

This project uses the Darts (Double-ARray Trie System) library, which is distributed under the BSD license and LGPL.

## Implementation Notes

The original Darts library has been modified for C++17 compatibility:

- Removed the `register` keyword which is deprecated in C++17
- No functional changes were made to the library
- The original copyright and license notices have been preserved

These modifications were made in accordance with the project requirements to respect the original code while ensuring compatibility with modern C++ standards.

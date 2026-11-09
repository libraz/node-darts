# node-darts

Darts (Double-ARray Trie System) for Node.js, compiled to WebAssembly.

[![CI](https://img.shields.io/github/actions/workflow/status/libraz/node-darts/ci.yml?branch=main&label=CI)](https://github.com/libraz/node-darts/actions)
[![npm](https://img.shields.io/npm/v/node-darts)](https://www.npmjs.com/package/node-darts)
[![codecov](https://codecov.io/gh/libraz/node-darts/branch/main/graph/badge.svg)](https://codecov.io/gh/libraz/node-darts)
[![License](https://img.shields.io/badge/license-MIT-blue)](https://github.com/libraz/node-darts/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-blue?logo=typescript)](https://www.typescriptlang.org/)

**node-darts builds, loads and searches double-array tries from Node.js and TypeScript.** The trie core is Rust compiled to WebAssembly and embedded in the package, so it installs the same way on every OS and CPU architecture: no compiler, no prebuilt binary, no install script. Dictionary files are byte-compatible with those written by the C++ Darts and darts-clone libraries.

**[Examples](https://github.com/libraz/node-darts/tree/main/examples)** &nbsp;·&nbsp; **[npm](https://www.npmjs.com/package/node-darts)**

## What's inside

- **Build and load** — build from keys, `[key, value]` pairs or a `Map`; load and save `.darts` files, or move the image as bytes.
- **Exact match** — one key lookup that returns its value, or `undefined`.
- **Common prefix search** — every dictionary key that starts the text, shortest first.
- **Trie traversal** — walk the trie one character at a time to see how far a text stays inside it.
- **Text replacement** — replace dictionary words in a text with a function, a `Map` or an object.
- **Two formats** — Darts 0.32 and darts-clone, chosen per dictionary and detected on load.
- **Typed, dual-format** — ships TypeScript declarations for both ESM and CommonJS.

## Installation

```bash
npm install node-darts
# or
yarn add node-darts
```

Requires Node.js 20.4 or later.

## Quick start

```js
import { Dictionary } from 'node-darts';
// CommonJS: const { Dictionary } = require('node-darts');

// Values are the input indexes of the keys. Pass [key, value] pairs or a Map to choose them.
const dict = Dictionary.build(['apple', 'pineapple', 'banana']);

dict.exactMatchSearch('banana'); // 2
dict.exactMatchSearch('grape'); // undefined

dict.commonPrefixSearch('pineapple pie'); // [{ value: 1, length: 9 }]

dict.replaceWords('I like apple and banana.', (word) => `<b>${word}</b>`);
// 'I like <b>apple</b> and <b>banana</b>.'
dict.replaceWords('I like apple and banana.', { apple: '🍎', banana: '🍌' });
// 'I like 🍎 and 🍌.'

await dict.save('fruits.darts');
const loaded = await Dictionary.load('fruits.darts');
loaded.exactMatchSearch('apple'); // 0

dict.dispose();
loaded.dispose();
```

A dictionary holds memory in the WebAssembly module until it is disposed or garbage collected. In TypeScript and Node.js 24 or later, `using dict = Dictionary.build(...)` disposes it at the end of the scope.

## API overview

Everything is exported from `node-darts`: `Dictionary`, the error classes and the option types.

| Member | Description |
|---|---|
| `Dictionary.build(input, options?)` | Builds from keys, `[key, value]` pairs or a `Map`. Throws `RangeError` on empty input or a value outside `0..2147483647`. |
| `Dictionary.load(path, options?)` / `loadSync` | Reads a `.darts` file. `path` is a string or a `file:` URL. |
| `Dictionary.fromBytes(bytes, options?)` | Reads a dictionary image from a `Uint8Array`. |
| `save(path)` / `saveSync(path)` / `toBytes()` | Writes the image to a file, or returns a copy of it. |
| `exactMatchSearch(key)` | The key's value, or `undefined`. |
| `commonPrefixSearch(text)` | `{ value, length }[]`, shortest first. `length` counts UTF-16 code units, so `text.slice(0, length)` is the matched key. |
| `traverse(text)` | `{ length, value }[]`, one element per character while the text stays in the trie. `value` is the value of the key that ends there, if any. |
| `replaceWords(text, replacer)` | Replaces the longest match at each position. `replacer` is `(match, value) => string`, a `Map` or an object. |
| `backend`, `byteLength`, `disposed` | Properties, readable after disposal. |
| `dispose()` | Frees the dictionary; idempotent. Every other method then throws. |

Failures that come from the data or the environment are `DartsError` subclasses carrying a `code`: `FileNotFoundError` (`ERR_DARTS_FILE_NOT_FOUND`), `InvalidDictionaryError` (`ERR_DARTS_INVALID_DICTIONARY`), `BuildError` (`ERR_DARTS_BUILD_FAILED`), plus `ERR_DARTS_DISPOSED` and `ERR_DARTS_IO` on `DartsError` itself. Wrong argument types and values are plain `TypeError` and `RangeError`. When ESM and CommonJS copies of the package may both be loaded, test `err.code` rather than `instanceof`.

Keys are stored as UTF-8 and may not contain NUL. If the core cannot allocate memory, the call throws `WebAssembly.RuntimeError`; treat the module as unusable afterwards.

## Backends

| `backend` | Format | Notes |
|---|---|---|
| `'darts'` (default for `build`) | Darts 0.32 | Compatible with `.darts` files written by Darts 0.32 and the tools built on it. Accepts the empty key. |
| `'clone'` | darts-clone | The darts-clone format. Rejects the empty key with `BuildError`. |

`load`, `loadSync` and `fromBytes` detect the format when `backend` is omitted. Passing it restricts loading to that format and throws `InvalidDictionaryError` for anything else.

## Build from source

```bash
yarn install
yarn build:wasm   # compile core/ (Rust) and embed it in src/generated/
yarn build        # TypeScript to dist/
make test         # Rust tests, then the JS suite once per backend
```

The toolchain and the test layout are described in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

The Rust core is a port of Darts 0.32 by Taku Kudo and of darts-clone; their notices are in [NOTICE](NOTICE).

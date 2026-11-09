# node-darts

Node.js 向けの Darts (Double-ARray Trie System)。WebAssembly にコンパイルして動かします。

[![CI](https://img.shields.io/github/actions/workflow/status/libraz/node-darts/ci.yml?branch=main&label=CI)](https://github.com/libraz/node-darts/actions)
[![npm](https://img.shields.io/npm/v/node-darts)](https://www.npmjs.com/package/node-darts)
[![codecov](https://codecov.io/gh/libraz/node-darts/branch/main/graph/badge.svg)](https://codecov.io/gh/libraz/node-darts)
[![License](https://img.shields.io/badge/license-MIT-blue)](https://github.com/libraz/node-darts/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-blue?logo=typescript)](https://www.typescriptlang.org/)

**node-darts は、ダブル配列トライの構築・読み込み・検索を Node.js と TypeScript から行えるライブラリです。** トライのコアは Rust 製で、WebAssembly にコンパイルしてパッケージに埋め込んであります。どの OS・CPU でも同じようにインストールでき、コンパイラ、ビルド済みバイナリ、インストールスクリプトは要りません。辞書ファイルは C++ の Darts および darts-clone が書き出すものとバイト単位で互換です。

**[サンプル](https://github.com/libraz/node-darts/tree/main/examples/ja)** &nbsp;·&nbsp; **[npm](https://www.npmjs.com/package/node-darts)**

## できること

- **構築と読み込み** — キー、`[key, value]` の組、`Map` から構築できます。`.darts` ファイルの読み書きのほか、バイト列での受け渡しもできます。
- **完全一致検索** — キーを 1 つ引き、値を返します。なければ `undefined` です。
- **共通接頭辞検索** — テキストの先頭に一致する辞書キーをすべて、短い順に返します。
- **トライの走査** — 1 文字ずつトライをたどり、テキストがどこまで木の中にあるかを調べます。
- **テキスト置換** — テキスト中の辞書語を、関数・`Map`・オブジェクトで置き換えます。
- **2 つの形式** — Darts 0.32 と darts-clone を辞書ごとに選べます。読み込み時には自動判別します。
- **型付き・デュアル形式** — ESM と CommonJS の両方に TypeScript の型定義を同梱しています。

## インストール

```bash
npm install node-darts
# または
yarn add node-darts
```

Node.js 20.4 以上が必要です。

## クイックスタート

```js
import { Dictionary } from 'node-darts';
// CommonJS: const { Dictionary } = require('node-darts');

// 値はキーの入力順インデックスです。値を選びたいときは [key, value] の組か Map を渡します。
const dict = Dictionary.build(['りんご', 'パイナップル', 'バナナ']);

dict.exactMatchSearch('バナナ'); // 2
dict.exactMatchSearch('ぶどう'); // undefined

dict.commonPrefixSearch('パイナップルパイ'); // [{ value: 1, length: 6 }]

dict.replaceWords('りんごとバナナを食べた。', (word) => `【${word}】`);
// '【りんご】と【バナナ】を食べた。'
dict.replaceWords('りんごとバナナを食べた。', { りんご: '🍎', バナナ: '🍌' });
// '🍎と🍌を食べた。'

await dict.save('fruits.darts');
const loaded = await Dictionary.load('fruits.darts');
loaded.exactMatchSearch('りんご'); // 0

dict.dispose();
loaded.dispose();
```

辞書は dispose されるかガベージコレクションされるまで、WebAssembly モジュールのメモリを保持します。TypeScript と Node.js 24 以上では、`using dict = Dictionary.build(...)` と書くとスコープの終わりで dispose されます。

## API の概要

すべて `node-darts` からエクスポートされます。`Dictionary`、エラークラス、オプションの型です。

| メンバー | 説明 |
|---|---|
| `Dictionary.build(input, options?)` | キー、`[key, value]` の組、`Map` から構築します。入力が空のとき、または値が `0..2147483647` の範囲外のときは `RangeError` を投げます。 |
| `Dictionary.load(path, options?)` / `loadSync` | `.darts` ファイルを読み込みます。`path` は文字列か `file:` URL です。 |
| `Dictionary.fromBytes(bytes, options?)` | `Uint8Array` の辞書イメージから読み込みます。 |
| `save(path)` / `saveSync(path)` / `toBytes()` | イメージをファイルに書き出します。`toBytes()` はイメージのコピーを返します。 |
| `exactMatchSearch(key)` | キーの値。なければ `undefined` です。 |
| `commonPrefixSearch(text)` | `{ value, length }[]` を短い順に返します。`length` は UTF-16 コード単位で、`text.slice(0, length)` が一致したキーです。 |
| `traverse(text)` | テキストがトライの中にある間、1 文字につき 1 要素の `{ length, value }[]` を返します。そこで終わるキーがあれば `value` にその値が入ります。 |
| `replaceWords(text, replacer)` | 各位置の最長一致を置換します。`replacer` は `(match, value) => string`、`Map`、オブジェクトのいずれかです。 |
| `backend`、`byteLength`、`disposed` | プロパティです。dispose 後も読めます。 |
| `dispose()` | 辞書を解放します。何度呼んでも構いません。以後、ほかのメソッドは例外を投げます。 |

データや環境に起因する失敗は、`code` を持つ `DartsError` のサブクラスです。`FileNotFoundError`（`ERR_DARTS_FILE_NOT_FOUND`）、`InvalidDictionaryError`（`ERR_DARTS_INVALID_DICTIONARY`）、`BuildError`（`ERR_DARTS_BUILD_FAILED`）に加え、`DartsError` 自身が `ERR_DARTS_DISPOSED` と `ERR_DARTS_IO` を持ちます。引数の型や値の誤りは標準の `TypeError` と `RangeError` です。ESM と CommonJS の両方でパッケージが読み込まれる可能性があるときは、`instanceof` ではなく `err.code` で判定します。

キーは UTF-8 で格納され、NUL を含められません。コアがメモリを確保できないときは `WebAssembly.RuntimeError` が投げられます。以後そのモジュールは使えないものとして扱ってください。

## バックエンド

| `backend` | 形式 | 備考 |
|---|---|---|
| `'darts'`（`build` の既定） | Darts 0.32 | Darts 0.32 とそれを使うツールが書く `.darts` ファイルと互換です。空のキーを格納できます。 |
| `'clone'` | darts-clone | darts-clone の形式です。空のキーは `BuildError` で拒否されます。 |

`load`、`loadSync`、`fromBytes` は、`backend` を省略すると形式を自動判別します。指定した場合はその形式だけを受け付け、それ以外は `InvalidDictionaryError` になります。

## ソースからビルド

```bash
yarn install
yarn build:wasm   # core/（Rust）をコンパイルし、src/generated/ に埋め込む
yarn build        # TypeScript を dist/ に出力
make test         # Rust のテスト、続いて JS のテストを backend ごとに実行
```

ツールチェーンとテストの構成は [CONTRIBUTING.md](CONTRIBUTING.md) にあります。

## ライセンス

[MIT](LICENSE)

Rust のコアは、Taku Kudo 氏の Darts 0.32 と darts-clone の移植です。それぞれの著作権表示は [NOTICE](NOTICE) にあります。

# node-darts

Node.js 用 Darts（Double-ARray Trie System）。WebAssembly で動作します

[![CI](https://img.shields.io/github/actions/workflow/status/libraz/node-darts/ci.yml?branch=main&label=CI)](https://github.com/libraz/node-darts/actions)
[![npm](https://img.shields.io/npm/v/node-darts)](https://www.npmjs.com/package/node-darts)
[![codecov](https://codecov.io/gh/libraz/node-darts/branch/main/graph/badge.svg)](https://codecov.io/gh/libraz/node-darts)
[![License](https://img.shields.io/badge/license-MIT-blue)](https://github.com/libraz/node-darts/blob/main/LICENSE)

## 概要

`node-darts`は、Darts（Double-ARray Trie System）の辞書を Node.js/TypeScript から使うためのライブラリです。トライの中核は Rust で書かれ、WebAssembly にコンパイルされています。そのため、どのプラットフォームでも同じ手順でインストールでき、コンパイラもビルド済みバイナリのダウンロードも install スクリプトも不要です。辞書ファイルは C++ 版の Darts および darts-clone が書き出すものとバイト単位で互換です。

## 特徴

- Perlの`Text::Darts`で作成された`.darts`辞書ファイルの読み込みと使用
- キーと値のペアから辞書を構築
- 高速な完全一致検索と共通接頭辞検索
- 辞書単語を使用したテキスト置換
- Trie構造のトラバース
- 非同期および同期API
- TypeScriptサポート
- ESModuleとCommonJSのサポート
- Perlの`Text::Darts`に似たクラスベースのインターフェース
- 2 つのディスク形式（Darts 0.32 と darts-clone）を辞書ごとに選択可能

## インストール

```bash
npm install node-darts
# または
yarn add node-darts
```

## 要件

- Node.js v20.0.0以上

これ以外は不要です。WebAssembly モジュールはパッケージに埋め込まれており、Node.js が動く OS と CPU アーキテクチャならどこでも動作します。

## 基本的な使用方法

```javascript
// ESModuleを使用
import { loadDictionary, TextDarts } from 'node-darts';

// CommonJSを使用
// const { loadDictionary, TextDarts } = require('node-darts');

// 既存の辞書ファイルを読み込む
const dict = loadDictionary('/path/to/dictionary.darts');

// 読み込んだ辞書を使用してテキスト置換
const text = 'I like apple and pineapple for breakfast.';
const replaced = dict.replaceWords(text, (word) => `<b>${word}</b>`);
console.log(replaced); // "I like <b>apple</b> and <b>pineapple</b> for breakfast."

// オブジェクトマッピングを使用した置換も可能
const mapping = {
  apple: '🍎',
  pineapple: '🍍',
};
const replaced2 = dict.replaceWords(text, mapping);
console.log(replaced2); // "I like 🍎 and 🍍 for breakfast."

// 完全一致検索
console.log(dict.exactMatchSearch('apple')); // 見つかった場合は対応する値を返す
console.log(dict.exactMatchSearch('grape')); // -1（見つからない）

// 共通接頭辞検索
const results = dict.commonPrefixSearch('pineapple');
console.log(results); // 見つかった値の配列

// リソースを解放
dict.dispose();

// 代替方法：TextDartsクラスを使用
const darts = TextDarts.load('/path/to/dictionary.darts');
const replaced3 = darts.replaceWords(text, mapping);
console.log(replaced3); // "I like 🍎 and 🍍 for breakfast."
darts.dispose();
```

## 辞書の作成

まだ辞書ファイルがない場合は、作成することができます：

```javascript
import { buildDictionary, buildAndSaveDictionary } from 'node-darts';

// キーと値から辞書を作成
const keys = ['apple', 'banana', 'orange', 'pineapple', 'strawberry'];
const values = [100, 200, 300, 400, 500];

// メモリ上に構築
const dict = buildDictionary(keys, values);

// またはファイルに構築して保存
await buildAndSaveDictionary(keys, '/path/to/output.darts', values);
```

## APIリファレンス

### Dictionaryクラス

- `exactMatchSearch(key: string): number` - 完全一致検索を行います
- `commonPrefixSearch(key: string): number[]` - 共通接頭辞検索を行います
- `replaceWords(text: string, replacer: WordReplacer): string` - テキスト内の辞書単語を検索して置換します
- `traverse(key: string, callback: TraverseCallback): void` - Trieをトラバースします
- `load(filePath: string): Promise<boolean>` - 辞書ファイルを非同期に読み込みます
- `loadSync(filePath: string): boolean` - 辞書ファイルを同期的に読み込みます
- `size(): number` - 辞書のサイズを取得します
- `dispose(): void` - リソースを解放します

### Builderクラス

- `build(keys: string[], values?: number[], options?: BuildOptions): Dictionary` - Double-Arrayを構築します
- `buildAndSave(keys: string[], filePath: string, values?: number[], options?: BuildOptions): Promise<boolean>` - 構築して非同期に保存します
- `buildAndSaveSync(keys: string[], filePath: string, values?: number[], options?: BuildOptions): boolean` - 構築して同期的に保存します

### TextDartsクラス

TextDartsクラスは、Perlの`Text::Darts`モジュールに似たクラスベースのインターフェースを提供します。より対象指向的なアプローチで辞書を扱うことができ、JavaScriptのガベージコレクションによる自動リソース管理も含まれています。

> **注意:** TextDartsクラスはファクトリーメソッドパターンを使用しており、`new TextDarts()`で直接インスタンス化することはできません。代わりに、静的ファクトリーメソッド（`TextDarts.build()`、`TextDarts.load()`、または`TextDarts.new()`）を使用してインスタンスを作成します。この設計上の選択は、オブジェクト生成の複雑さを隠蔽し、実行時にオブジェクトの型を決定できるようにし、検証ロジックを一箇所に集中させ、将来の生成プロセスの変更を容易にするためです。

#### 静的メソッド

- `static new(source: string[] | string, values?: number[]): TextDarts` - 単語リストまたは辞書ファイルから新しいTextDartsオブジェクトを作成します
- `static build(keys: string[], values?: number[], options?: BuildOptions): TextDarts` - 単語リストから新しいTextDartsオブジェクトを作成します
- `static load(filePath: string): TextDarts` - 辞書ファイルから新しいTextDartsオブジェクトを作成します
- `static buildAndSave(keys: string[], filePath: string, values?: number[], options?: BuildOptions): Promise<boolean>` - 辞書を構築して非同期に保存します
- `static buildAndSaveSync(keys: string[], filePath: string, values?: number[], options?: BuildOptions): boolean` - 辞書を構築して同期的に保存します

#### インスタンスメソッド

- `replaceWords(text: string, replacer: WordReplacer): string` - テキスト内の辞書単語を検索して置換します
- `exactMatchSearch(key: string): number` - 完全一致検索を行います
- `commonPrefixSearch(key: string): number[]` - 共通接頭辞検索を行います
- `traverse(key: string, callback: TraverseCallback): void` - Trieをトラバースします
- `load(filePath: string): Promise<boolean>` - 辞書ファイルを非同期に読み込みます
- `loadSync(filePath: string): boolean` - 辞書ファイルを同期的に読み込みます
- `size(): number` - 辞書のサイズを取得します
- `dispose(): void` - リソースを解放します（オプション、オブジェクトがガベージコレクションされるときに自動的にリソースが解放されます）

### ヘルパー関数

- `createDictionary(): Dictionary` - 新しいDictionaryオブジェクトを作成します
- `loadDictionary(filePath: string): Dictionary` - ファイルから辞書を読み込みます
- `buildDictionary(keys: string[], values?: number[], options?: BuildOptions): Dictionary` - キーと値から辞書を構築します
- `buildAndSaveDictionary(keys: string[], filePath: string, values?: number[], options?: BuildOptions): Promise<boolean>` - 辞書を構築して非同期に保存します
- `buildAndSaveDictionarySync(keys: string[], filePath: string, values?: number[], options?: BuildOptions): boolean` - 辞書を構築して同期的に保存します

### WordReplacerタイプ

`WordReplacer`タイプは以下のいずれかになります：

1. マッチした単語を受け取り、置換文字列を返す関数：

   ```typescript
   (match: string) => string;
   ```

2. 単語とその置換をマッピングするオブジェクト：
   ```typescript
   Record<string, string>;
   ```

### ビルドオプション

- `progressCallback?: (current: number, total: number) => void` - ビルド進捗のコールバック関数

## サンプル

詳細な使用例は[examples](./examples)ディレクトリを参照してください：

- [基本的な使用方法](./examples/basic-usage.js)
- [辞書ビルダー](./examples/dictionary-builder.js)
- [テキスト置換](./examples/text-replacement.js)
- [オートコンプリート](./examples/auto-complete.js)
- [エラーハンドリング](./examples/error-handling.js)
- [形態素解析](./examples/morphological-analysis.js)

### テキスト置換の例

`replaceWords`メソッドを使用すると、テキスト内の辞書単語を検索して、カスタム値に置換することができます。これは以下のようなタスクに役立ちます：

- テキスト正規化
- エンティティ認識とハイライト
- コンテンツフィルタリング
- 簡単な形態素解析

```javascript
import { buildDictionary } from 'node-darts';

// 辞書を作成
const keys = ['apple', 'banana', 'orange', 'pineapple'];
const values = [1, 2, 3, 4];
const dict = buildDictionary(keys, values);

// 関数を使用してテキスト内の単語を置換
const text = 'I like apple and pineapple.';
const replaced = dict.replaceWords(text, (word) => `${word.toUpperCase()}`);
console.log(replaced); // "I like APPLE and PINEAPPLE."

// オブジェクトマッピングを使用して置換
const mapping = {
  apple: 'red apple',
  pineapple: 'yellow pineapple',
};
const replaced2 = dict.replaceWords(text, mapping);
console.log(replaced2); // "I like red apple and yellow pineapple."

// リソースを解放
dict.dispose();
```

### TextDartsクラスの例

TextDartsクラスはより対象指向的なアプローチを提供し、自動リソース管理も含まれています：

```javascript
import { TextDarts } from 'node-darts';

// 単語リストからTextDartsオブジェクトを作成
const keys = ['apple', 'banana', 'orange', 'pineapple'];
const values = [1, 2, 3, 4];
const darts = TextDarts.build(keys, values);

// 検索を実行
console.log(darts.exactMatchSearch('apple')); // 1
console.log(darts.commonPrefixSearch('pineapple')); // [1, 4]

// テキスト内の単語を置換
const text = 'I like apple and pineapple.';
const replaced = darts.replaceWords(text, (word) => `${word.toUpperCase()}`);
console.log(replaced); // "I like APPLE and PINEAPPLE."

// オブジェクトがガベージコレクションされるときに自動的にリソースが解放されます
// 必要に応じて明示的に解放することもできます
darts.dispose();

// 既存の辞書ファイルを読み込む
const loadedDarts = TextDarts.load('/path/to/dictionary.darts');
console.log(loadedDarts.exactMatchSearch('apple')); // 見つかった場合は対応する値を返す
```

### 高度な使用法：コンテキストを持つテキスト置換

`replaceWords`メソッドをより高度なテキスト処理に使用することができます：

```javascript
import { TextDarts } from 'node-darts';

// ハイライトする用語を含む辞書を作成
const terms = ['JavaScript', 'TypeScript', 'Node.js', 'Darts', 'Trie'];
const darts = TextDarts.build(terms);

// 処理するテキスト
const article = `
Node.jsアプリケーションはJavaScriptまたはTypeScriptで書くことができます。
このライブラリはDartsアルゴリズムを使用してTrie構造を実装しています。
`;

// ハイライト用のHTMLタグで置換
const highlighted = darts.replaceWords(article, (term) => {
  return `<span class="highlight">${term}</span>`;
});

console.log(highlighted);
// 出力：
// <span class="highlight">Node.js</span>アプリケーションは<span class="highlight">JavaScript</span>または<span class="highlight">TypeScript</span>で書くことができます。
// このライブラリは<span class="highlight">Darts</span>アルゴリズムを使用して<span class="highlight">Trie</span>構造を実装しています。

// リソースを解放（オプション）
darts.dispose();
```

## バックエンド (Darts vs darts-clone)

2 つのダブル配列形式はどちらも WebAssembly コアに組み込まれており、`backend` オプションで辞書ごとに選択できます:

- `'darts'` (デフォルト) — オリジナルの Darts 0.32 形式
- `'clone'` — よりコンパクトな `darts-clone` 形式

ファイルは対応する C++ ライブラリが書き出すものとバイト単位で互換で、相互に読み書きできます。

```javascript
// 明示的にバックエンドを指定して構築
const dict = buildDictionary(keys, values, { backend: 'clone' });

// 保存と再読み込み — 自動判別が正しいバックエンドを選ぶ
const file = '/tmp/dict.darts';
buildAndSaveDictionarySync(keys, file, values, { backend: 'clone' });
const reloaded = loadDictionary(file);
console.log(reloaded.getBackend()); // 'clone'

// 自動判別を行わず、特定のバックエンドを強制
const explicit = loadDictionary(file, { backend: 'clone' });
```

`loadDictionary(path)` を `backend` なしで呼ぶと、ローダはまず `darts-clone` で読み込みを試み（こちらはディスク上のフォーマットを厳密に検証する）、拒否された場合は taku910 にフォールバックします。判別をスキップしたい場合は `{ backend }` を明示してください。

公開している API は両バックエンドで同一ですが、いくつかの挙動が異なります:

- **ディスク上のフォーマットに互換性はありません。** 一方のバックエンドで構築した `.darts` ファイルはもう一方では読み込めません。
- `darts-clone` は構築時に長さ0のキーを拒否しますが、オリジナルは黙って受け入れます。
- `darts-clone` は読み込み時に不正な辞書ファイルを拒否します。Darts 形式には検証できるヘッダがないため、どんなファイルでも受け入れます（不正なファイルに対する検索はクラッシュせず、見つからない扱いになります）。自動判別が clone を先に試すのはこのためです。

`dict.getBackend()` (または `TextDarts#getBackend()`) で、辞書が現在どちらのバックエンドを使っているかを確認できます。

## エラーハンドリング

このライブラリは以下のカスタムエラークラスを提供します：

- `DartsError` - 基本エラークラス
- `FileNotFoundError` - ファイルが見つからない場合にスローされます
- `InvalidDictionaryError` - 無効な辞書ファイルの場合にスローされます
- `BuildError` - 辞書構築時のエラーでスローされます

## ライセンス

`node-darts` プロジェクト自体は MIT ライセンスで提供されます（[LICENSE](./LICENSE) を参照）。

WebAssembly コアは以下 2 つのライブラリの Rust 移植で、各ライブラリのライセンスを引き継ぎます:

- **Darts**（Taku Kudo 氏）— BSD ライセンスまたは LGPL のデュアルライセンス。移植版は BSD ライセンスで配布します。
- **darts-clone**（Susumu Yata 氏）— BSD 2-Clause ライセンス。

著作権表示とライセンス本文は [NOTICE](./NOTICE) に収録しています。

## 謝辞

トライの中核は以下 2 つのライブラリを移植したものです:

- [Darts（Double-ARray Trie System）](http://chasen.org/~taku/software/darts/) — Taku Kudo 氏、BSD ライセンスまたは LGPL で配布。
- [darts-clone](https://github.com/s-yata/darts-clone) — Susumu Yata 氏、BSD 2-Clause ライセンスで配布。

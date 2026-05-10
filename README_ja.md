# node-darts

Node.js用 Darts（Double-ARray Trie System）ネイティブアドオン

[![npm version](https://badge.fury.io/js/node-darts.svg)](https://badge.fury.io/js/node-darts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/libraz/node-darts/actions/workflows/ci.yml/badge.svg)](https://github.com/libraz/node-darts/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/libraz/node-darts/branch/main/graph/badge.svg)](https://codecov.io/gh/libraz/node-darts)

## 概要

`node-darts`は、C++版Dartsライブラリ（Double-ARray Trie System）へのバインディングを提供するNode.jsネイティブアドオンです。Node.js/TypeScript環境で`.darts`辞書ファイルを高パフォーマンスで利用できます。

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

## インストール

```bash
npm install node-darts
# または
yarn add node-darts
```

## 要件

- Node.js v20.0.0以上
- C++17をサポートするC++コンパイラ

### Windows環境での要件

Windowsを使用している場合、以下が必要です：

- C++ワークロードを含むVisual Studio Build Tools
- Python 2.7または3.x

これらの依存関係がない場合、パッケージはインストール時に自動的にインストールを試みます。自動インストールが失敗した場合は、手動でインストールできます：

1. [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)をインストールし、「C++によるデスクトップ開発」ワークロードを選択
2. [Python](https://www.python.org/downloads/)（2.7または3.x）をインストール
3. npm設定を行う：`npm config set msvs_version 2019`

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

両方の Darts 実装が一つのネイティブアドオンに同居しており、`backend` オプションでランタイムに選択できます:

- `'darts'` (デフォルト) — taku910 によるオリジナルの Darts ライブラリ
- `'clone'` — s-yata による、より高速でコンパクトな `darts-clone` 再実装

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
- `darts-clone` は読み込み時に不正な辞書ファイルを拒否しますが、オリジナルは受け入れた後にクラッシュする可能性があります — 自動判別が clone を優先するのはこのためです。

`dict.getBackend()` (または `TextDarts#getBackend()`) で、辞書が現在どちらのバックエンドを使っているかを確認できます。

## エラーハンドリング

このライブラリは以下のカスタムエラークラスを提供します：

- `DartsError` - 基本エラークラス
- `FileNotFoundError` - ファイルが見つからない場合にスローされます
- `InvalidDictionaryError` - 無効な辞書ファイルの場合にスローされます
- `BuildError` - 辞書構築時のエラーでスローされます

## ライセンス

MIT

## 謝辞

このプロジェクトは、BSDライセンスとLGPLで配布されているDarts（Double-ARray Trie System）ライブラリを使用しています。

## 実装に関する注意点

オリジナルのDartsライブラリはC++17互換性のために以下の修正を行っています：

- C++17で非推奨となった`register`キーワードを削除
- ライブラリの機能的な変更は一切行っていません
- オリジナルの著作権表示とライセンス通知は保持されています

これらの修正は、プロジェクトの要件に従って、オリジナルのコードを尊重しつつ、現代のC++標準との互換性を確保するために行われました。

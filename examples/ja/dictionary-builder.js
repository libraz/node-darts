/**
 * node-darts の辞書構築と保存の例
 *
 * このサンプルでは、以下の操作を行います：
 * 1. 辞書ビルダーの作成
 * 2. 辞書の構築と保存
 * 3. 保存した辞書の読み込み
 * 4. 辞書の検索
 */

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars, no-restricted-syntax, no-console */
const path = require('node:path');
const fs = require('node:fs');
const {
  createBuilder,
  loadDictionary,
  buildAndSaveDictionary,
  buildAndSaveDictionarySync,
} = require('../../dist');

// 辞書ファイルのパス
const dictPath = path.join(__dirname, 'example-dict.darts');

// 辞書に登録するキーと値
const keys = ['apple', 'application', 'banana', 'orange', 'pineapple', 'strawberry'];

const values = [100, 101, 200, 300, 400, 500];
const _syncResult = buildAndSaveDictionarySync(keys, dictPath, values);
const dict = loadDictionary(dictPath);
const results = dict.commonPrefixSearch('apple');
for (const result of results) {
  const keyIndex = values.indexOf(result);
  if (keyIndex !== -1) {
  }
}

// リソースを解放
dict.dispose();

// 非同期版の例
async function asyncExample() {
  // 非同期に辞書を構築して保存
  const asyncDictPath = path.join(__dirname, 'async-example-dict.darts');
  const _asyncResult = await buildAndSaveDictionary(keys, asyncDictPath, values);
  const asyncDict = loadDictionary(asyncDictPath);

  // リソースを解放
  asyncDict.dispose();
  if (fs.existsSync(dictPath)) {
    fs.unlinkSync(dictPath);
  }
  if (fs.existsSync(asyncDictPath)) {
    fs.unlinkSync(asyncDictPath);
  }
}

// 非同期例を実行
asyncExample().catch(console.error);

/**
 * 実行結果例：
 *
 * 辞書を同期的に構築して保存しています...
 * 辞書の保存結果: true
 *
 * 辞書を読み込んでいます...
 * 辞書の読み込みに成功しました
 *
 * --- 辞書の検索 ---
 * apple: 100
 * application: 101
 * banana: 200
 *
 * --- 共通接頭辞検索 ---
 * 「apple」の検索結果:
 *   - apple (100)
 *
 * 辞書を非同期的に構築して保存しています...
 * 辞書の保存結果: true
 * 辞書を読み込んでいます...
 * 辞書の読み込みに成功しました
 *
 * --- 辞書の検索 ---
 * apple: 100
 * application: 101
 *
 * クリーンアップしています...
 * クリーンアップが完了しました
 */

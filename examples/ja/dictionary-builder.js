/**
 * node-darts の辞書構築と保存の例
 * 
 * このサンプルでは、以下の操作を行います：
 * 1. 辞書ビルダーの作成
 * 2. 辞書の構築と保存
 * 3. 保存した辞書の読み込み
 * 4. 辞書の検索
 */

const path = require('path');
const fs = require('fs');
const {
  createBuilder,
  loadDictionary,
  buildAndSaveDictionary,
  buildAndSaveDictionarySync
} = require('../../dist');

// 辞書ファイルのパス
const dictPath = path.join(__dirname, 'example-dict.darts');

// 辞書に登録するキーと値
const keys = [
  'apple',
  'application',
  'banana',
  'orange',
  'pineapple',
  'strawberry'
];

const values = [100, 101, 200, 300, 400, 500];

// 同期的に辞書を構築して保存
console.log('辞書を同期的に構築して保存しています...');
const syncResult = buildAndSaveDictionarySync(keys, dictPath, values);
console.log(`辞書の保存結果: ${syncResult}`);

// 保存した辞書を読み込み
console.log('\n辞書を読み込んでいます...');
const dict = loadDictionary(dictPath);
console.log('辞書の読み込みに成功しました');

// 辞書を検索
console.log('\n--- 辞書の検索 ---');
console.log(`apple: ${dict.exactMatchSearch('apple')}`);
console.log(`application: ${dict.exactMatchSearch('application')}`);
console.log(`banana: ${dict.exactMatchSearch('banana')}`);

// 共通接頭辞検索
console.log('\n--- 共通接頭辞検索 ---');
console.log('「apple」の検索結果:');
const results = dict.commonPrefixSearch('apple');
for (const result of results) {
  const keyIndex = values.indexOf(result);
  if (keyIndex !== -1) {
    console.log(`  - ${keys[keyIndex]} (${result})`);
  }
}

// リソースを解放
dict.dispose();

// 非同期版の例
async function asyncExample() {
  // 非同期に辞書を構築して保存
  const asyncDictPath = path.join(__dirname, 'async-example-dict.darts');
  
  console.log('\n辞書を非同期的に構築して保存しています...');
  const asyncResult = await buildAndSaveDictionary(keys, asyncDictPath, values);
  console.log(`辞書の保存結果: ${asyncResult}`);
  
  // 保存した辞書を読み込み
  console.log('辞書を読み込んでいます...');
  const asyncDict = loadDictionary(asyncDictPath);
  console.log('辞書の読み込みに成功しました');
  
  // 辞書を検索
  console.log('\n--- 辞書の検索 ---');
  console.log(`apple: ${asyncDict.exactMatchSearch('apple')}`);
  console.log(`application: ${asyncDict.exactMatchSearch('application')}`);
  
  // リソースを解放
  asyncDict.dispose();
  
  // 一時ファイルを削除
  console.log('\nクリーンアップしています...');
  if (fs.existsSync(dictPath)) {
    fs.unlinkSync(dictPath);
  }
  if (fs.existsSync(asyncDictPath)) {
    fs.unlinkSync(asyncDictPath);
  }
  console.log('クリーンアップが完了しました');
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
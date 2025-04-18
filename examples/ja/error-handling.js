/**
 * エラーハンドリングの例
 *
 * このサンプルでは、node-dartsのエラーハンドリング方法を示します。
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-console, @typescript-eslint/no-unused-vars */
const path = require('path');
const fs = require('fs');
const {
  Dictionary,
  Builder,
  TextDarts,
  DartsError,
  FileNotFoundError,
  InvalidDictionaryError,
  BuildError,
} = require('../../dist');

console.log('=== エラーハンドリングの例 ===');

// 1. 存在しないファイルを読み込む
try {
  const dict = new Dictionary();
  dict.loadSync('non-existent-file.darts');
} catch (error) {
  console.log('\n1. 存在しないファイルを読み込む:');
  if (error instanceof FileNotFoundError) {
    console.log(`  FileNotFoundError: ${error.message}`);
  } else {
    console.log(`  Unexpected error: ${error.message}`);
  }
}

// 2. 無効な辞書ファイルを読み込む
try {
  // 無効なファイルを作成
  const invalidFilePath = path.join(__dirname, 'invalid.darts');
  fs.writeFileSync(invalidFilePath, 'This is not a valid darts file');

  // Dictionary クラスを使用する方法
  const dict = new Dictionary();
  dict.loadSync(invalidFilePath);

  // テスト後にファイルを削除
  fs.unlinkSync(invalidFilePath);
} catch (error) {
  console.log('\n2. 無効な辞書ファイルを読み込む:');
  if (error instanceof InvalidDictionaryError) {
    console.log(`  InvalidDictionaryError: ${error.message}`);
  } else {
    console.log(`  Unexpected error: ${error.message}`);
  }
}

// 3. 空のキー配列で辞書を構築
try {
  const builder = new Builder();
  builder.build([]);
} catch (error) {
  console.log('\n3. 空のキー配列で辞書を構築:');
  if (error instanceof BuildError) {
    console.log(`  BuildError: ${error.message}`);
  } else {
    console.log(`  Unexpected error: ${error.message}`);
  }
}

// 4. キーと値の配列の長さが一致しない
try {
  const builder = new Builder();
  builder.build(['a', 'b', 'c'], [1, 2]);
} catch (error) {
  console.log('\n4. キーと値の配列の長さが一致しない:');
  if (error instanceof BuildError) {
    console.log(`  BuildError: ${error.message}`);
  } else {
    console.log(`  Unexpected error: ${error.message}`);
  }
}

// 5. TextDartsクラスを使用したエラーハンドリング
try {
  // 存在しないファイルを読み込む
  const darts = TextDarts.load('non-existent-file.darts');
} catch (error) {
  console.log('\n5. TextDartsクラスを使用したエラーハンドリング:');
  if (error instanceof FileNotFoundError) {
    console.log(`  FileNotFoundError: ${error.message}`);
  } else {
    console.log(`  Unexpected error: ${error.message}`);
  }
}

// 6. 非同期APIのエラーハンドリング
async function asyncErrorHandling() {
  try {
    // TextDartsクラスの静的メソッドを使用
    await TextDarts.buildAndSave(['a', 'b'], '/invalid/path/dict.darts');
  } catch (error) {
    console.log('\n6. 非同期APIのエラーハンドリング:');
    if (error instanceof DartsError) {
      console.log(`  DartsError: ${error.message}`);
    } else {
      console.log(`  Unexpected error: ${error.message}`);
    }
  }
}

asyncErrorHandling().catch(console.error);

/**
 * 実行結果例：
 *
 * === エラーハンドリングの例 ===
 *
 * 1. 存在しないファイルを読み込む:
 *   FileNotFoundError: File not found: non-existent-file.darts
 *
 * 2. 無効な辞書ファイルを読み込む:
 *   InvalidDictionaryError: Invalid dictionary: ...
 *
 * 3. 空のキー配列で辞書を構築:
 *   BuildError: Build error: Empty keys array
 *
 * 4. キーと値の配列の長さが一致しない:
 *   BuildError: Build error: Values array length must match keys array length
 *
 * 5. TextDartsクラスを使用したエラーハンドリング:
 *   FileNotFoundError: File not found: non-existent-file.darts
 *
 * 6. 非同期APIのエラーハンドリング:
 *   DartsError: Failed to save dictionary: ...
 */

/**
 * node-darts 基本的な使用例
 *
 * このサンプルでは以下の操作を行います：
 * 1. 既存の辞書ファイルの読み込み
 * 2. 読み込んだ辞書を使ったテキスト置換
 * 3. 完全一致検索
 * 4. 共通接頭辞検索
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-console, */
const { loadDictionary, TextDarts, buildAndSaveDictionary } = require('../../dist');

// まず、サンプル辞書ファイルを作成します
console.log('サンプル辞書ファイルを作成しています...');
const keys = ['りんご', 'バナナ', 'オレンジ', 'パイナップル', 'いちご'];
const values = [100, 200, 300, 400, 500];

// 辞書を構築して保存
// CommonJSではasync/awaitをトップレベルで使用できないため、関数内で実行
async function main() {
  try {
    // 辞書を構築して保存
    await buildAndSaveDictionary(keys, './fruits.darts', values);
    console.log('辞書を ./fruits.darts に保存しました');

    // 辞書ファイルを読み込み
    console.log('\n--- 辞書の読み込み ---');
    const dict = loadDictionary('./fruits.darts');
    console.log('辞書の読み込みに成功しました');

    // 読み込んだ辞書を使ったテキスト置換
    console.log('\n--- テキスト置換 ---');
    const text = '私はりんごとパイナップルが朝食に好きです。';
    console.log(`元のテキスト: "${text}"`);

    // 関数を使った単語の置換
    const replaced = dict.replaceWords(text, (word) => `<b>${word}</b>`);
    console.log(`HTMLタグ付き: "${replaced}"`);
    // 出力: "私は<b>りんご</b>と<b>パイナップル</b>が朝食に好きです。"

    // オブジェクトマッピングを使った単語の置換
    const mapping = {
      りんご: '🍎',
      パイナップル: '🍍',
      バナナ: '🍌',
      オレンジ: '🍊',
      いちご: '🍓',
    };
    const replaced2 = dict.replaceWords(text, mapping);
    console.log(`絵文字付き: "${replaced2}"`);
    // 出力: "私は🍎と🍍が朝食に好きです。"

    // 完全一致検索
    console.log('\n--- 完全一致検索 ---');
    console.log(`りんご: ${dict.exactMatchSearch('りんご')}`);
    console.log(`バナナ: ${dict.exactMatchSearch('バナナ')}`);
    console.log(`ぶどう（辞書にない）: ${dict.exactMatchSearch('ぶどう')}`);

    // 共通接頭辞検索
    console.log('\n--- 共通接頭辞検索 ---');
    const results = dict.commonPrefixSearch('パイナップル');
    console.log(`'パイナップル'の検索結果: ${JSON.stringify(results)}`);

    // 別の方法: TextDartsクラスを使用
    console.log('\n--- TextDartsクラスの使用 ---');
    const darts = TextDarts.load('./fruits.darts');
    console.log('辞書ファイルからTextDartsオブジェクトを作成しました');
    const replaced3 = darts.replaceWords(text, mapping);
    console.log(`TextDartsを使用: "${replaced3}"`);

    // リソースの解放
    console.log('\n--- クリーンアップ ---');
    dict.dispose();
    darts.dispose();
    console.log('リソースを解放しました');
  } catch (error) {
    console.error('エラー:', error);
  }
}

// メイン関数を実行
main();

/**
 * 実行結果例：
 *
 * サンプル辞書ファイルを作成しています...
 * 辞書を ./fruits.darts に保存しました
 *
 * --- 辞書の読み込み ---
 * 辞書の読み込みに成功しました
 *
 * --- テキスト置換 ---
 * 元のテキスト: "私はりんごとパイナップルが朝食に好きです。"
 * HTMLタグ付き: "私は<b>りんご</b>と<b>パイナップル</b>が朝食に好きです。"
 * 絵文字付き: "私は🍎と🍍が朝食に好きです。"
 *
 * --- 完全一致検索 ---
 * りんご: 300
 * バナナ: 200
 * ぶどう（辞書にない）: -1
 *
 * --- 共通接頭辞検索 ---
 * 'パイナップル'の検索結果: [100]
 *
 * --- TextDartsクラスの使用 ---
 * 辞書ファイルからTextDartsオブジェクトを作成しました
 * TextDartsを使用: "私は🍎と🍍が朝食に好きです。"
 *
 * --- クリーンアップ ---
 * リソースを解放しました
 */

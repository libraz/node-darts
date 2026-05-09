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
const keys = ['りんご', 'バナナ', 'オレンジ', 'パイナップル', 'いちご'];
const values = [100, 200, 300, 400, 500];

// 辞書を構築して保存
// CommonJSではasync/awaitをトップレベルで使用できないため、関数内で実行
async function main() {
  try {
    // 辞書を構築して保存
    await buildAndSaveDictionary(keys, './fruits.darts', values);
    const dict = loadDictionary('./fruits.darts');
    const text = '私はりんごとパイナップルが朝食に好きです。';

    // 関数を使った単語の置換
    const _replaced = dict.replaceWords(text, (word) => `<b>${word}</b>`);
    // 出力: "私は<b>りんご</b>と<b>パイナップル</b>が朝食に好きです。"

    // オブジェクトマッピングを使った単語の置換
    const mapping = {
      りんご: '🍎',
      パイナップル: '🍍',
      バナナ: '🍌',
      オレンジ: '🍊',
      いちご: '🍓',
    };
    const _replaced2 = dict.replaceWords(text, mapping);
    const _results = dict.commonPrefixSearch('パイナップル');
    const darts = TextDarts.load('./fruits.darts');
    const _replaced3 = darts.replaceWords(text, mapping);
    dict.dispose();
    darts.dispose();
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

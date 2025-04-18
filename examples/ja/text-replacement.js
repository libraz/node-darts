/**
 * TextDartsを使用したテキスト置換の例
 *
 * このサンプルでは、TextDartsクラスを使用してテキスト内の単語を置換する方法を示します。
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const { TextDarts } = require('../../dist');

// 単語リストから辞書を作成（方法1: newを使用）
const words = ['ALGOL', 'ANSI', 'ARCO', 'ARPA', 'ARPANET', 'ASCII'];
const td1 = TextDarts.new(words);

// 単語リストから辞書を作成（方法2: buildを使用）
const td2 = TextDarts.build(words);

// 置換用のサンプルテキスト
const text = 'ARPANET is a net by ARPA';
console.log(`元のテキスト: "${text}"`);

// 例1: コールバック関数を使用した単語の置換
const result1 = td1.replaceWords(text, (match) => `<<${match}>>`);
console.log(`\n例1 - コールバック関数の使用:`);
console.log(`結果: "${result1}"`);
// 出力: "<<ARPANET>> is a net by <<ARPA>>"

// 例2: 置換マップを使用した単語の置換
const replacementMap = {};
words.forEach((word) => {
  replacementMap[word] = word.toLowerCase();
});

const result2 = td1.replaceWords(text, replacementMap);
console.log(`\n例2 - 置換マップの使用:`);
console.log(`結果: "${result2}"`);
// 出力: "arpanet is a net by arpa"

// 例3: HTMLリンクの生成
const result3 = td1.replaceWords(text, (match) => {
  return `<a href="http://dictionary.com/browse/${match}">${match}</a>`;
});
console.log(`\n例3 - HTMLリンクの生成:`);
console.log(`結果: "${result3}"`);
// 出力: "<a href="http://dictionary.com/browse/ARPANET">ARPANET</a> is a net by <a href="http://dictionary.com/browse/ARPA">ARPA</a>"

// 例4: 辞書の構築と保存
const newWords = ['りんご', 'バナナ', 'オレンジ', 'ぶどう'];
console.log(`\n例4 - 辞書の構築と保存:`);
console.log(`辞書を構築する単語: ${newWords.join(', ')}`);
TextDarts.buildAndSaveSync(newWords, './fruits.darts');
console.log(`辞書を ./fruits.darts に保存しました`);

// 例5: ファイルから辞書を読み込む
console.log(`\n例5 - ファイルからの辞書の読み込み:`);
const fruitsDict = TextDarts.load('./fruits.darts');
console.log(`辞書の読み込みに成功しました`);

// 例6: 完全一致検索
console.log(`\n例6 - 完全一致検索:`);
console.log(`'りんご'の検索結果: ${fruitsDict.exactMatchSearch('りんご')}`);
console.log(`'バナナ'の検索結果: ${fruitsDict.exactMatchSearch('バナナ')}`);
console.log(`'キウイ'（辞書にない）の検索結果: ${fruitsDict.exactMatchSearch('キウイ')}`);

// 例7: 共通接頭辞検索
console.log(`\n例7 - 共通接頭辞検索:`);
const prefixResults = fruitsDict.commonPrefixSearch('りんご');
console.log(`'りんご'の共通接頭辞検索結果: ${JSON.stringify(prefixResults)}`);

// リソースのクリーンアップ（オプション、ガベージコレクションによって自動的にクリーンアップされます）
console.log(`\nリソースのクリーンアップ...`);
td1.dispose();
td2.dispose();
fruitsDict.dispose();
console.log(`リソースを解放しました`);

/**
 * 実行結果例：
 *
 * 元のテキスト: "ARPANET is a net by ARPA"
 *
 * 例1 - コールバック関数の使用:
 * 結果: "<<ARPANET>> is a net by <<ARPA>>"
 *
 * 例2 - 置換マップの使用:
 * 結果: "arpanet is a net by arpa"
 *
 * 例3 - HTMLリンクの生成:
 * 結果: "<a href="http://dictionary.com/browse/ARPANET">ARPANET</a> is a net by <a href="http://dictionary.com/browse/ARPA">ARPA</a>"
 *
 * 例4 - 辞書の構築と保存:
 * 辞書を構築する単語: りんご, バナナ, オレンジ, ぶどう
 * 辞書を ./fruits.darts に保存しました
 *
 * 例5 - ファイルからの辞書の読み込み:
 * 辞書の読み込みに成功しました
 *
 * 例6 - 完全一致検索:
 * 'りんご'の検索結果: 1
 * 'バナナ'の検索結果: 3
 * 'キウイ'（辞書にない）の検索結果: -1
 *
 * 例7 - 共通接頭辞検索:
 * 'りんご'の共通接頭辞検索結果: [1]
 *
 * リソースのクリーンアップ...
 * リソースを解放しました
 */

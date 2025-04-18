/**
 * 形態素解析のような辞書検索の例
 *
 * このサンプルでは、簡易的な形態素解析を行います。
 * 実際の形態素解析器はもっと複雑ですが、Dartsの使い方を示すための簡易版です。
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-console, no-plusplus, no-undef, @typescript-eslint/no-unused-vars */
const { buildDictionary, TextDarts } = require('../../dist');

// 簡略化した例
const words = ['apple', 'banana', 'orange'];
const values = [1, 2, 3];

console.log(`words length: ${words.length}, values length: ${values.length}`);

try {
  // 辞書を構築
  const dict = buildDictionary(words, values);
  console.log('辞書構築成功！');

  // 検索テスト
  console.log(`apple: ${dict.exactMatchSearch('apple')}`);
  console.log(`banana: ${dict.exactMatchSearch('banana')}`);
  console.log(`orange: ${dict.exactMatchSearch('orange')}`);

  // リソースを解放
  dict.dispose();
  console.log('リソースを解放しました。');
} catch (error) {
  console.error('エラー:', error);
}

console.log('辞書構築成功！');

/**
 * 簡易形態素解析を行う関数
 * @param {string} text 解析するテキスト
 * @returns {Array<{word: string, pos: number}>} 解析結果
 */
function analyzeText(text) {
  const result = [];
  let position = 0;

  while (position < text.length) {
    let found = false;

    // 現在位置から始まる最長の単語を探す
    for (let len = Math.min(10, text.length - position); len > 0; len--) {
      const substr = text.substring(position, position + len);
      const value = dict.exactMatchSearch(substr);

      if (value !== -1) {
        result.push({
          word: substr,
          pos: value,
        });
        position += len;
        found = true;
        break;
      }
    }

    // 辞書に見つからない場合は1文字進める
    if (!found) {
      result.push({
        word: text[position],
        pos: -1, // 未知語
      });
      position++;
    }
  }

  return result;
}

// 品詞名のマッピング
const posNames = ['名詞', '助詞', '動詞', '助動詞', '形容詞', '未知語'];

// TextDartsクラスを使用した例
try {
  const darts = TextDarts.build(['red', 'green', 'blue'], [10, 20, 30]);
  console.log('TextDarts構築成功！');

  console.log(`red: ${darts.exactMatchSearch('red')}`);
  console.log(`green: ${darts.exactMatchSearch('green')}`);
  console.log(`blue: ${darts.exactMatchSearch('blue')}`);

  darts.dispose();
} catch (error) {
  console.error('TextDartsエラー:', error);
}

// 注: TextDartsクラスはファクトリーメソッドパターンを使用しており、
// new TextDarts()ではなく、TextDarts.build()やTextDarts.load()などの
// 静的メソッドを使用してインスタンス化します。

/**
 * 実行結果例：
 *
 * === 形態素解析の例 ===
 *
 * 入力: 私は日本語を勉強しています
 * 解析結果:
 *   "私" - 名詞
 *   "は" - 助詞
 *   "日本" - 名詞
 *   "語" - 名詞
 *   "を" - 助詞
 *   "勉強" - 名詞
 *   "し" - 動詞
 *   "て" - 助動詞
 *   "い" - 動詞
 *   "ます" - 助動詞
 *
 * 入力: 今日は良い天気です
 * 解析結果:
 *   "今日" - 名詞
 *   "は" - 助詞
 *   "良い" - 形容詞
 *   "天気" - 名詞
 *   "です" - 助動詞
 *
 * 入力: 東京に行きたい
 * 解析結果:
 *   "東京" - 名詞
 *   "に" - 助詞
 *   "行き" - 動詞
 *   "たい" - 形容詞
 */

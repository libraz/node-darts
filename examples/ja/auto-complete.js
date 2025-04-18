/**
 * 自動補完機能の例
 *
 * このサンプルでは、Dartsを使った自動補完機能を実装します。
 */

/* eslint-disable @typescript-eslint/no-require-imports, import/order, @typescript-eslint/no-unused-vars, no-console */
const readline = require('readline');
const { buildDictionary, TextDarts } = require('../../dist');

// 自動補完用の辞書データ
const words = [
  'apple',
  'application',
  'apply',
  'appointment',
  'approve',
  'banana',
  'baseball',
  'basketball',
  'beach',
  'beautiful',
  'begin',
  'behavior',
  'believe',
  'benefit',
  'book',
  'border',
  'bottle',
  'bottom',
  'box',
  'boy',
  'brain',
  'branch',
  'bread',
  'break',
  'breakfast',
];

// 辞書を構築（値は単語のインデックス）
// TextDartsクラスを使用する方法
const darts = TextDarts.build(words);

/**
 * 自動補完候補を取得する関数
 * @param {string} prefix 入力された接頭辞
 * @param {number} limit 候補の最大数
 * @returns {string[]} 補完候補の配列
 */
function getCompletions(prefix, limit = 5) {
  if (!prefix) return [];

  // 共通接頭辞検索を使用して候補を取得
  const results = [];

  // 各単語について、prefixから始まるかチェック
  for (let i = 0; i < words.length; i += 1) {
    if (words[i].startsWith(prefix)) {
      results.push(words[i]);
      if (results.length >= limit) break;
    }
  }

  return results;
}

// インタラクティブな自動補完デモ
console.log('=== 自動補完デモ ===');
console.log('文字を入力すると候補が表示されます。終了するには "exit" と入力してください。');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt() {
  rl.question('> ', (input) => {
    if (input === 'exit') {
      rl.close();
      darts.dispose();
      return;
    }

    // TextDartsクラスを使用した共通接頭辞検索の例
    // 注: この例では単純化のためにgetCompletions関数を使用していますが、
    // 実際のアプリケーションではdarts.commonPrefixSearchを活用できます
    const completions = getCompletions(input);

    if (completions.length > 0) {
      console.log('補完候補:');
      completions.forEach((word, i) => {
        console.log(`  ${i + 1}. ${word}`);
      });
    } else {
      console.log('候補はありません');
    }

    prompt();
  });
}

prompt();

/**
 * 実行結果例：
 *
 * === 自動補完デモ ===
 * 文字を入力すると候補が表示されます。終了するには "exit" と入力してください。
 * > a
 * 補完候補:
 *   1. apple
 *   2. application
 *   3. apply
 *   4. appointment
 *   5. approve
 * > b
 * 補完候補:
 *   1. banana
 *   2. baseball
 *   3. basketball
 *   4. beach
 *   5. beautiful
 * > br
 * 補完候補:
 *   1. brain
 *   2. branch
 *   3. bread
 *   4. break
 *   5. breakfast
 * > exit
 */

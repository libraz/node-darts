import { Dictionary } from 'node-darts';

const words = ['東京', '東京駅', '東京都', '東京タワー', '大阪', '大阪城', '大宮'];
const dict = Dictionary.build(words);

// traverse() は 1 文字ずつ木をたどり、木から外れた文字で止まります。
// 返る配列の長さが入力と等しければ、入力はどれかのキーの接頭辞です。
function isPrefix(text) {
  return dict.traverse(text).length === text.length;
}

// 接頭辞が木にあるときだけ単語リストを走査します。
function complete(prefix) {
  return isPrefix(prefix) ? words.filter((w) => w.startsWith(prefix)) : [];
}

for (const prefix of ['東京', '大', '名古']) {
  console.log(prefix, '->', complete(prefix));
}
dict.dispose();

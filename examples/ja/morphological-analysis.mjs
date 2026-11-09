import { Dictionary } from 'node-darts';

// キーは単語、値は品詞表のインデックスです。
const tags = ['名詞', '動詞', '助詞'];
const entries = [
  ['東京', 0],
  ['東京都', 0],
  ['京都', 0],
  ['に', 2],
  ['行く', 1],
];
const dict = Dictionary.build(entries);

// 最長一致で分割します。各位置で最も長いキーを取り、一致がなければ 1 文字進みます。
function segment(text) {
  const tokens = [];
  let offset = 0;
  while (offset < text.length) {
    const rest = text.slice(offset);
    const best = dict.commonPrefixSearch(rest).at(-1);
    if (best) {
      tokens.push({ surface: rest.slice(0, best.length), tag: tags[best.value] });
      offset += best.length;
    } else {
      const ch = String.fromCodePoint(rest.codePointAt(0));
      tokens.push({ surface: ch, tag: '未知語' });
      offset += ch.length;
    }
  }
  return tokens;
}

console.log(segment('東京都に行く'));
dict.dispose();

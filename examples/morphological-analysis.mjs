import { Dictionary } from 'node-darts';

// Keys are words; each value indexes into the tag table.
const tags = ['noun', 'verb', 'particle'];
const entries = [
  ['東京', 0],
  ['東京都', 0],
  ['京都', 0],
  ['に', 2],
  ['行く', 1],
];
const dict = Dictionary.build(entries);

// Greedy longest-match segmentation: at each position take the longest key,
// and fall back to a single character when nothing matches.
function segment(text) {
  const tokens = [];
  let offset = 0;
  while (offset < text.length) {
    const rest = text.slice(offset);
    const matches = dict.commonPrefixSearch(rest);
    const best = matches.at(-1);
    if (best) {
      tokens.push({ surface: rest.slice(0, best.length), tag: tags[best.value] });
      offset += best.length;
    } else {
      const ch = String.fromCodePoint(rest.codePointAt(0));
      tokens.push({ surface: ch, tag: 'unknown' });
      offset += ch.length;
    }
  }
  return tokens;
}

console.log(segment('東京都に行く'));
dict.dispose();

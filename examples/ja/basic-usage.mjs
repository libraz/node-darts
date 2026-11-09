import { Dictionary } from 'node-darts';

const dict = Dictionary.build(['りんご', 'バナナ', 'パイナップル']);

// 値はキーの入力順インデックスです。
console.log(dict.exactMatchSearch('バナナ')); // 1
console.log(dict.exactMatchSearch('ぶどう')); // undefined

// テキストの先頭に一致する辞書キーをすべて、短い順に返します。
const text = 'パイナップルパイ';
for (const { value, length } of dict.commonPrefixSearch(text)) {
  console.log(`値 ${value}: 「${text.slice(0, length)}」`);
}

const sentence = '朝食にりんごとバナナを食べた。';
console.log(dict.replaceWords(sentence, (word) => `【${word}】`));
console.log(dict.replaceWords(sentence, { りんご: '🍎', バナナ: '🍌' }));

console.log(dict.backend, dict.byteLength);
dict.dispose();

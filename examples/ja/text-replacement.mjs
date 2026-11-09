import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Dictionary } from 'node-darts';

const dict = Dictionary.build(['JavaScript', 'TypeScript', 'Node.js']);
const text = 'TypeScript は JavaScript にコンパイルされ、Node.js で動く。';

// 関数には一致した文字列とその値が渡されます。
console.log(dict.replaceWords(text, (word) => `<code>${word}</code>`));
console.log(dict.replaceWords(text, (word, value) => `[${value}:${word}]`));

// オブジェクトや Map は一致を置換先に対応づけます。対応のない一致はそのまま残ります。
console.log(dict.replaceWords(text, { JavaScript: 'JS', TypeScript: 'TS' }));
console.log(dict.replaceWords(text, new Map([['Node.js', 'Node']])));

// リンクの生成。
const urls = { 'Node.js': 'https://nodejs.org', TypeScript: 'https://www.typescriptlang.org' };
console.log(
  dict.replaceWords(text, (word) => (urls[word] ? `<a href="${urls[word]}">${word}</a>` : word))
);

// 保存した辞書でも同じように置換できます。
const dir = mkdtempSync(join(tmpdir(), 'node-darts-'));
try {
  const file = join(dir, 'tech.darts');
  dict.saveSync(file);
  const loaded = Dictionary.loadSync(file);
  console.log(loaded.replaceWords(text, () => '＊'));
  loaded.dispose();
} finally {
  rmSync(dir, { recursive: true, force: true });
  dict.dispose();
}

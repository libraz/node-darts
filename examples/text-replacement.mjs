import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Dictionary } from 'node-darts';

const dict = Dictionary.build(['JavaScript', 'TypeScript', 'Node.js']);
const text = 'TypeScript compiles to JavaScript that runs on Node.js.';

// A function receives the match and its value.
console.log(dict.replaceWords(text, (word) => `<code>${word}</code>`));
console.log(dict.replaceWords(text, (word, value) => `[${value}:${word}]`));

// An object or a Map maps matches to replacements; unmapped matches stay as is.
console.log(dict.replaceWords(text, { JavaScript: 'JS', TypeScript: 'TS' }));
console.log(dict.replaceWords(text, new Map([['Node.js', 'Node']])));

// Links.
const urls = { 'Node.js': 'https://nodejs.org', TypeScript: 'https://www.typescriptlang.org' };
console.log(
  dict.replaceWords(text, (word) => (urls[word] ? `<a href="${urls[word]}">${word}</a>` : word))
);

// A saved dictionary replaces text the same way.
const dir = mkdtempSync(join(tmpdir(), 'node-darts-'));
try {
  const file = join(dir, 'tech.darts');
  dict.saveSync(file);
  const loaded = Dictionary.loadSync(file);
  console.log(loaded.replaceWords(text, () => '*'));
  loaded.dispose();
} finally {
  rmSync(dir, { recursive: true, force: true });
  dict.dispose();
}

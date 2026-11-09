import { Dictionary } from 'node-darts';

const words = ['app', 'apple', 'application', 'apply', 'banana', 'band', 'bandana'];
const dict = Dictionary.build(words);

// traverse() walks the trie one character at a time and stops at the first
// character that leaves it, so its length says how much of the input is a
// prefix of some key.
function isPrefix(text) {
  return dict.traverse(text).length === text.length;
}

// Complete a prefix against the word list. The trie answers "is this a prefix
// of any key?" cheaply, so the list is only scanned when it is.
function complete(prefix) {
  return isPrefix(prefix) ? words.filter((w) => w.startsWith(prefix)) : [];
}

for (const prefix of ['app', 'ban', 'ora']) {
  console.log(prefix, '->', complete(prefix));
}
dict.dispose();

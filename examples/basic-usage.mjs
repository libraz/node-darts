import { Dictionary } from 'node-darts';

const dict = Dictionary.build(['apple', 'banana', 'pineapple']);

// Values are the input indexes of the keys.
console.log(dict.exactMatchSearch('banana')); // 1
console.log(dict.exactMatchSearch('grape')); // undefined

// Every dictionary key that is a prefix of the text, shortest first.
for (const { value, length } of dict.commonPrefixSearch('pineapple pie')) {
  console.log(`value ${value}: "${'pineapple pie'.slice(0, length)}"`);
}

const text = 'I like apple and pineapple.';
console.log(dict.replaceWords(text, (word) => `<b>${word}</b>`));
console.log(dict.replaceWords(text, { apple: 'APPLE', pineapple: 'PINEAPPLE' }));

console.log(dict.backend, dict.byteLength);
dict.dispose();

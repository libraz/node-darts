/**
 * Example of dictionary search similar to morphological analysis
 *
 * This sample performs a simple morphological analysis.
 * Actual morphological analyzers are more complex, but this is a simplified version
 * to demonstrate how to use Darts.
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-console */

const { buildDictionary } = require('../dist');

// Japanese word dictionary (simplified version)
const words = [
  '私',
  'は',
  '日本',
  '語',
  'を',
  '勉強',
  'し',
  'て',
  'い',
  'ます',
  '今日',
  'は',
  '良い',
  '天気',
  'です',
  '東京',
  'に',
  '行き',
  'たい',
];

// Part-of-speech information (0: noun, 1: particle, 2: verb, 3: auxiliary verb, 4: adjective)
const posInfo = [0, 1, 0, 0, 1, 0, 2, 3, 2, 3, 0, 1, 4, 0, 3, 0, 1, 2, 4];

// Create a map of words to their part-of-speech
const posMap = {};
for (let i = 0; i < words.length; i += 1) {
  posMap[words[i]] = posInfo[i];
}

// Build the dictionary
const dict = buildDictionary(words);
console.log('Dictionary built successfully!');

/**
 * Function to perform simple morphological analysis
 * @param {string} text Text to analyze
 * @returns {Array<{word: string, pos: number}>} Analysis results
 */
function analyzeText(text) {
  const result = [];
  let position = 0;

  while (position < text.length) {
    let found = false;

    // Find the longest word starting from the current position
    for (let len = Math.min(10, text.length - position); len > 0; len -= 1) {
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

    // If not found in the dictionary, advance by one character
    if (!found) {
      result.push({
        word: text[position],
        pos: -1, // Unknown word
      });
      position += 1;
    }
  }

  return result;
}

// Part-of-speech name mapping
const posNames = ['Noun', 'Particle', 'Verb', 'Auxiliary Verb', 'Adjective', 'Unknown'];

// Analyze texts
const text1 = '私は日本語を勉強しています';
const text2 = '今日は良い天気です';
const text3 = '東京に行きたい';

console.log('\n=== Morphological Analysis Example ===');

[text1, text2, text3].forEach((text) => {
  console.log(`\nInput: ${text}`);
  console.log('Analysis results:');

  const analyzed = analyzeText(text);
  analyzed.forEach((item) => {
    // Use posMap to get the part-of-speech for the word
    const pos = item.word in posMap ? posMap[item.word] : -1;
    const posName = pos === -1 ? posNames[5] : posNames[pos];
    console.log(`  "${item.word}" - ${posName}`);
  });
});

// Release resources
dict.dispose();
console.log('\nDictionary resources released.');

/**
 * Example output:
 *
 * === Morphological Analysis Example ===
 *
 * Input: 私は日本語を勉強しています
 * Analysis results:
 *   "私" - Noun
 *   "は" - Particle
 *   "日本" - Noun
 *   "語" - Noun
 *   "を" - Particle
 *   "勉強" - Noun
 *   "し" - Verb
 *   "て" - Auxiliary Verb
 *   "い" - Verb
 *   "ます" - Auxiliary Verb
 *
 * Input: 今日は良い天気です
 * Analysis results:
 *   "今日" - Noun
 *   "は" - Particle
 *   "良い" - Adjective
 *   "天気" - Noun
 *   "です" - Auxiliary Verb
 *
 * Input: 東京に行きたい
 * Analysis results:
 *   "東京" - Noun
 *   "に" - Particle
 *   "行き" - Verb
 *   "たい" - Adjective
 */

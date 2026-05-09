/**
 * node-darts Basic Usage Example
 *
 * This example demonstrates:
 * 1. Loading an existing dictionary
 * 2. Text replacement using the loaded dictionary
 * 3. Exact match search
 * 4. Common prefix search
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-console */

const { loadDictionary, TextDarts, buildAndSaveDictionary } = require('../dist');
const keys = ['apple', 'banana', 'orange', 'pineapple', 'strawberry'];
const values = [100, 200, 300, 400, 500];

// Build and save the dictionary
// Using a function to execute async/await since it cannot be used at the top level in CommonJS
async function main() {
  try {
    // Build and save the dictionary
    await buildAndSaveDictionary(keys, './fruits.darts', values);
    const dict = loadDictionary('./fruits.darts');
    const text = 'I like apple and pineapple for breakfast.';

    // Replace words using a function
    const _replaced = dict.replaceWords(text, (word) => `<b>${word}</b>`);
    // Output: "I like <b>apple</b> and <b>pineapple</b> for breakfast."

    // Replace words using an object mapping
    const mapping = {
      apple: '🍎',
      pineapple: '🍍',
      banana: '🍌',
      orange: '🍊',
      strawberry: '🍓',
    };
    const _replaced2 = dict.replaceWords(text, mapping);
    const _results = dict.commonPrefixSearch('pineapple');
    const darts = TextDarts.load('./fruits.darts');
    const _replaced3 = darts.replaceWords(text, mapping);
    dict.dispose();
    darts.dispose();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the main function
main();

/**
 * Expected output:
 *
 * Creating a sample dictionary file...
 * Dictionary saved to ./fruits.darts
 *
 * --- Loading Dictionary ---
 * Dictionary loaded successfully
 *
 * --- Text Replacement ---
 * Original text: "I like apple and pineapple for breakfast."
 * With HTML tags: "I like <b>apple</b> and <b>pineapple</b> for breakfast."
 * With emojis: "I like 🍎 and 🍍 for breakfast."
 *
 * --- Exact Match Search ---
 * apple: 100
 * banana: 200
 * grape (not in dictionary): -1
 *
 * --- Common Prefix Search ---
 * Results for 'pineapple': [400]
 *
 * --- Using TextDarts Class ---
 * TextDarts object created from dictionary file
 * With TextDarts: "I like 🍎 and 🍍 for breakfast."
 *
 * --- Cleanup ---
 * Resources disposed
 */

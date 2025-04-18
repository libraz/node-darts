/**
 * node-darts Basic Usage Example
 *
 * This example demonstrates:
 * 1. Loading an existing dictionary
 * 2. Text replacement using the loaded dictionary
 * 3. Exact match search
 * 4. Common prefix search
 */

const { loadDictionary, TextDarts, buildAndSaveDictionary } = require('../dist');

// First, let's create a sample dictionary file if it doesn't exist
console.log('Creating a sample dictionary file...');
const keys = ['apple', 'banana', 'orange', 'pineapple', 'strawberry'];
const values = [100, 200, 300, 400, 500];

// Build and save the dictionary
// Using a function to execute async/await since it cannot be used at the top level in CommonJS
async function main() {
  try {
    // Build and save the dictionary
    await buildAndSaveDictionary(keys, './fruits.darts', values);
    console.log('Dictionary saved to ./fruits.darts');

    // Load the dictionary file
    console.log('\n--- Loading Dictionary ---');
    const dict = loadDictionary('./fruits.darts');
    console.log('Dictionary loaded successfully');

    // Text replacement using the loaded dictionary
    console.log('\n--- Text Replacement ---');
    const text = "I like apple and pineapple for breakfast.";
    console.log(`Original text: "${text}"`);

    // Replace words using a function
    const replaced = dict.replaceWords(text, (word) => `<b>${word}</b>`);
    console.log(`With HTML tags: "${replaced}"`);
    // Output: "I like <b>apple</b> and <b>pineapple</b> for breakfast."

    // Replace words using an object mapping
    const mapping = {
      'apple': '🍎',
      'pineapple': '🍍',
      'banana': '🍌',
      'orange': '🍊',
      'strawberry': '🍓'
    };
    const replaced2 = dict.replaceWords(text, mapping);
    console.log(`With emojis: "${replaced2}"`);
    // Output: "I like 🍎 and 🍍 for breakfast."

    // Exact match search
    console.log('\n--- Exact Match Search ---');
    console.log(`apple: ${dict.exactMatchSearch('apple')}`);
    console.log(`banana: ${dict.exactMatchSearch('banana')}`);
    console.log(`grape (not in dictionary): ${dict.exactMatchSearch('grape')}`);

    // Common prefix search
    console.log('\n--- Common Prefix Search ---');
    const results = dict.commonPrefixSearch('pineapple');
    console.log(`Results for 'pineapple': ${JSON.stringify(results)}`);

    // Alternative: Using TextDarts class
    console.log('\n--- Using TextDarts Class ---');
    const darts = TextDarts.load('./fruits.darts');
    console.log('TextDarts object created from dictionary file');
    const replaced3 = darts.replaceWords(text, mapping);
    console.log(`With TextDarts: "${replaced3}"`);

    // Clean up resources
    console.log('\n--- Cleanup ---');
    dict.dispose();
    darts.dispose();
    console.log('Resources disposed');
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
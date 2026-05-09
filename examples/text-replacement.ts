/**
 * Text replacement example using TextDarts
 *
 * This example demonstrates how to use the TextDarts class to replace words in text.
 */

/* eslint-disable no-console */
import { TextDarts } from '../dist';

// Create a dictionary from word list (Method 1: using new)
const words = ['ALGOL', 'ANSI', 'ARCO', 'ARPA', 'ARPANET', 'ASCII'];
const td1 = TextDarts.new(words);

// Create a dictionary from word list (Method 2: using build)
const td2 = TextDarts.build(words);

// Sample text for replacement
const text = 'ARPANET is a net by ARPA';

// Example 1: Replace words with a callback function
const _result1 = td1.replaceWords(text, (match) => `<<${match}>>`);
// Output: "<<ARPANET>> is a net by <<ARPA>>"

// Example 2: Replace words with a replacement map
const replacementMap: Record<string, string> = {};
words.forEach((word) => {
  replacementMap[word] = word.toLowerCase();
});

const _result2 = td1.replaceWords(text, replacementMap);
// Output: "arpanet is a net by arpa"

// Example 3: Generate HTML links
const _result3 = td1.replaceWords(text, (match) => {
  return `<a href="http://dictionary.com/browse/${match}">${match}</a>`;
});
// Output: "<a href="http://dictionary.com/browse/ARPANET">ARPANET</a> is a net by <a href="http://dictionary.com/browse/ARPA">ARPA</a>"

// Example 4: Build and save a dictionary
const newWords = ['apple', 'banana', 'orange', 'grape'];
TextDarts.buildAndSaveSync(newWords, './fruits.darts');
const fruitsDict = TextDarts.load('./fruits.darts');
const _prefixResults = fruitsDict.commonPrefixSearch('apple');
td1.dispose();
td2.dispose();
fruitsDict.dispose();

/**
 * Expected output:
 *
 * Original text: "ARPANET is a net by ARPA"
 *
 * Example 1 - Using callback function:
 * Result: "<<ARPANET>> is a net by <<ARPA>>"
 *
 * Example 2 - Using replacement map:
 * Result: "arpanet is a net by arpa"
 *
 * Example 3 - Generating HTML links:
 * Result: "<a href="http://dictionary.com/browse/ARPANET">ARPANET</a> is a net by <a href="http://dictionary.com/browse/ARPA">ARPA</a>"
 *
 * Example 4 - Building and saving a dictionary:
 * Building dictionary with words: apple, banana, orange, grape
 * Dictionary saved to ./fruits.darts
 *
 * Example 5 - Loading a dictionary from file:
 * Dictionary loaded successfully
 *
 * Example 6 - Exact match search:
 * Search for 'apple': 0
 * Search for 'banana': 1
 * Search for 'kiwi' (not in dictionary): -1
 *
 * Example 7 - Common prefix search:
 * Common prefix search for 'apple': [0]
 *
 * Cleaning up resources...
 * Resources cleaned up
 */

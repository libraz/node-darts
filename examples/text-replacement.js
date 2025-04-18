/**
 * Text replacement example using TextDarts
 * 
 * This example demonstrates how to use the TextDarts class to replace words in text.
 */

const { TextDarts } = require('../dist');

// Create a dictionary from word list (Method 1: using new)
const words = ['ALGOL', 'ANSI', 'ARCO', 'ARPA', 'ARPANET', 'ASCII'];
const td1 = TextDarts.new(words);

// Create a dictionary from word list (Method 2: using build)
const td2 = TextDarts.build(words);

// Sample text for replacement
const text = "ARPANET is a net by ARPA";
console.log(`Original text: "${text}"`);

// Example 1: Replace words with a callback function
const result1 = td1.replaceWords(text, (match) => `<<${match}>>`);
console.log(`\nExample 1 - Using callback function:`);
console.log(`Result: "${result1}"`);
// Output: "<<ARPANET>> is a net by <<ARPA>>"

// Example 2: Replace words with a replacement map
const replacementMap = {};
words.forEach(word => {
  replacementMap[word] = word.toLowerCase();
});

const result2 = td1.replaceWords(text, replacementMap);
console.log(`\nExample 2 - Using replacement map:`);
console.log(`Result: "${result2}"`);
// Output: "arpanet is a net by arpa"

// Example 3: Generate HTML links
const result3 = td1.replaceWords(text, (match) => {
  return `<a href="http://dictionary.com/browse/${match}">${match}</a>`;
});
console.log(`\nExample 3 - Generating HTML links:`);
console.log(`Result: "${result3}"`);
// Output: "<a href="http://dictionary.com/browse/ARPANET">ARPANET</a> is a net by <a href="http://dictionary.com/browse/ARPA">ARPA</a>"

// Example 4: Build and save a dictionary
const newWords = ['apple', 'banana', 'orange', 'grape'];
console.log(`\nExample 4 - Building and saving a dictionary:`);
console.log(`Building dictionary with words: ${newWords.join(', ')}`);
TextDarts.buildAndSaveSync(newWords, './fruits.darts');
console.log(`Dictionary saved to ./fruits.darts`);

// Example 5: Load a dictionary from file
console.log(`\nExample 5 - Loading a dictionary from file:`);
const fruitsDict = TextDarts.load('./fruits.darts');
console.log(`Dictionary loaded successfully`);

// Example 6: Exact match search
console.log(`\nExample 6 - Exact match search:`);
console.log(`Search for 'apple': ${fruitsDict.exactMatchSearch('apple')}`);
console.log(`Search for 'banana': ${fruitsDict.exactMatchSearch('banana')}`);
console.log(`Search for 'kiwi' (not in dictionary): ${fruitsDict.exactMatchSearch('kiwi')}`);

// Example 7: Common prefix search
console.log(`\nExample 7 - Common prefix search:`);
const prefixResults = fruitsDict.commonPrefixSearch('apple');
console.log(`Common prefix search for 'apple': ${JSON.stringify(prefixResults)}`);

// Clean up resources (optional, will be automatically cleaned up by garbage collection)
console.log(`\nCleaning up resources...`);
td1.dispose();
td2.dispose();
fruitsDict.dispose();
console.log(`Resources cleaned up`);

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
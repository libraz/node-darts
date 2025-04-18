/**
 * Dictionary Building and Saving Example for node-darts
 * 
 * This sample demonstrates:
 * 1. Creating a dictionary builder
 * 2. Building and saving a dictionary
 * 3. Loading a saved dictionary
 * 4. Searching the dictionary
 */

const path = require('path');
const fs = require('fs');
const {
  createBuilder,
  loadDictionary,
  buildAndSaveDictionary,
  buildAndSaveDictionarySync
} = require('../dist');

// Dictionary file path
const dictPath = path.join(__dirname, 'example-dict.darts');

// Keys and values to register in the dictionary
const keys = [
  'apple',
  'application',
  'banana',
  'orange',
  'pineapple',
  'strawberry'
];

const values = [100, 101, 200, 300, 400, 500];

// Build and save dictionary synchronously
console.log('Building and saving dictionary synchronously...');
const syncResult = buildAndSaveDictionarySync(keys, dictPath, values);
console.log(`Dictionary saved: ${syncResult}`);

// Load the saved dictionary
console.log('\nLoading dictionary...');
const dict = loadDictionary(dictPath);
console.log('Dictionary loaded successfully');

// Search the dictionary
console.log('\n--- Searching Dictionary ---');
console.log(`apple: ${dict.exactMatchSearch('apple')}`);
console.log(`application: ${dict.exactMatchSearch('application')}`);
console.log(`banana: ${dict.exactMatchSearch('banana')}`);

// Common prefix search
console.log('\n--- Common Prefix Search ---');
console.log('Results for "apple":');
const results = dict.commonPrefixSearch('apple');
for (const result of results) {
  const keyIndex = values.indexOf(result);
  if (keyIndex !== -1) {
    console.log(`  - ${keys[keyIndex]} (${result})`);
  }
}

// Release resources
dict.dispose();

// Asynchronous example
async function asyncExample() {
  // Build and save dictionary asynchronously
  const asyncDictPath = path.join(__dirname, 'async-example-dict.darts');
  
  console.log('\nBuilding and saving dictionary asynchronously...');
  const asyncResult = await buildAndSaveDictionary(keys, asyncDictPath, values);
  console.log(`Dictionary saved: ${asyncResult}`);
  
  // Load the saved dictionary
  console.log('Loading dictionary...');
  const asyncDict = loadDictionary(asyncDictPath);
  console.log('Dictionary loaded successfully');
  
  // Search the dictionary
  console.log('\n--- Searching Dictionary ---');
  console.log(`apple: ${asyncDict.exactMatchSearch('apple')}`);
  console.log(`application: ${asyncDict.exactMatchSearch('application')}`);
  
  // Release resources
  asyncDict.dispose();
  
  // Clean up temporary files
  console.log('\nCleaning up...');
  if (fs.existsSync(dictPath)) {
    fs.unlinkSync(dictPath);
  }
  if (fs.existsSync(asyncDictPath)) {
    fs.unlinkSync(asyncDictPath);
  }
  console.log('Cleanup complete');
}

// Run the asynchronous example
asyncExample().catch(console.error);

/**
 * Example output:
 * 
 * Building and saving dictionary synchronously...
 * Dictionary saved: true
 * 
 * Loading dictionary...
 * Dictionary loaded successfully
 * 
 * --- Searching Dictionary ---
 * apple: 100
 * application: 101
 * banana: 200
 * 
 * --- Common Prefix Search ---
 * Results for "apple":
 *   - apple (100)
 * 
 * Building and saving dictionary asynchronously...
 * Dictionary saved: true
 * Loading dictionary...
 * Dictionary loaded successfully
 * 
 * --- Searching Dictionary ---
 * apple: 100
 * application: 101
 * 
 * Cleaning up...
 * Cleanup complete
 */
/**
 * Dictionary Building and Saving Example for node-darts
 *
 * This sample demonstrates:
 * 1. Creating a dictionary builder
 * 2. Building and saving a dictionary
 * 3. Loading a saved dictionary
 * 4. Searching the dictionary
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-console, no-restricted-syntax */

const path = require('node:path');
const fs = require('node:fs');
const { loadDictionary, buildAndSaveDictionary, buildAndSaveDictionarySync } = require('../dist');

// Dictionary file path
const dictPath = path.join(__dirname, 'example-dict.darts');

// Keys and values to register in the dictionary
const keys = ['apple', 'application', 'banana', 'orange', 'pineapple', 'strawberry'];

const values = [100, 101, 200, 300, 400, 500];
const _syncResult = buildAndSaveDictionarySync(keys, dictPath, values);
const dict = loadDictionary(dictPath);
const results = dict.commonPrefixSearch('apple');
results.forEach((result) => {
  const keyIndex = values.indexOf(result);
  if (keyIndex !== -1) {
  }
});

// Release resources
dict.dispose();

// Asynchronous example
async function asyncExample() {
  // Build and save dictionary asynchronously
  const asyncDictPath = path.join(__dirname, 'async-example-dict.darts');
  const _asyncResult = await buildAndSaveDictionary(keys, asyncDictPath, values);
  const asyncDict = loadDictionary(asyncDictPath);

  // Release resources
  asyncDict.dispose();
  if (fs.existsSync(dictPath)) {
    fs.unlinkSync(dictPath);
  }
  if (fs.existsSync(asyncDictPath)) {
    fs.unlinkSync(asyncDictPath);
  }
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

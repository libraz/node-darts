/**
 * Error handling example
 *
 * This sample demonstrates how to handle errors in node-darts.
 */

/* eslint-disable @typescript-eslint/no-require-imports, global-require, no-console, */

const path = require('path');
const {
  Dictionary,
  Builder,
  DartsError,
  FileNotFoundError,
  InvalidDictionaryError,
  BuildError,
} = require('../dist');

console.log('=== Error Handling Example ===');

// 1. Loading a non-existent file
try {
  const dict = new Dictionary();
  dict.loadSync('non-existent-file.darts');
} catch (error) {
  console.log('\n1. Loading a non-existent file:');
  if (error instanceof FileNotFoundError) {
    console.log(`  FileNotFoundError: ${error.message}`);
  } else {
    console.log(`  Unexpected error: ${error.message}`);
  }
}

// 2. Loading an invalid dictionary file
try {
  // Create an invalid file
  const fs = require('fs');
  const invalidFilePath = path.join(__dirname, 'invalid.darts');
  fs.writeFileSync(invalidFilePath, 'This is not a valid darts file');

  const dict = new Dictionary();
  dict.loadSync(invalidFilePath);

  // Clean up after test
  fs.unlinkSync(invalidFilePath);
} catch (error) {
  console.log('\n2. Loading an invalid dictionary file:');
  if (error instanceof InvalidDictionaryError) {
    console.log(`  InvalidDictionaryError: ${error.message}`);
  } else {
    console.log(`  Unexpected error: ${error.message}`);
  }
}

// 3. Building a dictionary with empty keys array
try {
  const builder = new Builder();
  builder.build([]);
} catch (error) {
  console.log('\n3. Building a dictionary with empty keys array:');
  if (error instanceof BuildError) {
    console.log(`  BuildError: ${error.message}`);
  } else {
    console.log(`  Unexpected error: ${error.message}`);
  }
}

// 4. Building a dictionary with mismatched keys and values arrays
try {
  const builder = new Builder();
  builder.build(['a', 'b', 'c'], [1, 2]);
} catch (error) {
  console.log('\n4. Building a dictionary with mismatched keys and values arrays:');
  if (error instanceof BuildError) {
    console.log(`  BuildError: ${error.message}`);
  } else {
    console.log(`  Unexpected error: ${error.message}`);
  }
}

// 5. Handling errors in asynchronous API
async function asyncErrorHandling() {
  try {
    const builder = new Builder();
    await builder.buildAndSave(['a', 'b'], '/invalid/path/dict.darts');
  } catch (error) {
    console.log('\n5. Handling errors in asynchronous API:');
    if (error instanceof DartsError) {
      console.log(`  DartsError: ${error.message}`);
    } else {
      console.log(`  Unexpected error: ${error.message}`);
    }
  }
}

asyncErrorHandling().catch(console.error);

/**
 * Example output:
 *
 * === Error Handling Example ===
 *
 * 1. Loading a non-existent file:
 *   FileNotFoundError: File not found: non-existent-file.darts
 *
 * 2. Loading an invalid dictionary file:
 *   InvalidDictionaryError: Invalid dictionary file: ...
 *
 * 3. Building a dictionary with empty keys array:
 *   BuildError: Cannot build dictionary with empty keys array
 *
 * 4. Building a dictionary with mismatched keys and values arrays:
 *   BuildError: Keys and values arrays must have the same length
 *
 * 5. Handling errors in asynchronous API:
 *   DartsError: Failed to save dictionary: ...
 */

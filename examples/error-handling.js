/**
 * Error handling example
 *
 * This sample demonstrates how to handle errors in node-darts.
 */

/* eslint-disable @typescript-eslint/no-require-imports, global-require, no-console, */

const path = require('node:path');
const {
  Dictionary,
  Builder,
  DartsError,
  FileNotFoundError,
  InvalidDictionaryError,
  BuildError,
} = require('../dist');

// 1. Loading a non-existent file
try {
  const dict = new Dictionary();
  dict.loadSync('non-existent-file.darts');
} catch (error) {
  if (error instanceof FileNotFoundError) {
  } else {
  }
}

// 2. Loading an invalid dictionary file
try {
  // Create an invalid file
  const fs = require('node:fs');
  const invalidFilePath = path.join(__dirname, 'invalid.darts');
  fs.writeFileSync(invalidFilePath, 'This is not a valid darts file');

  const dict = new Dictionary();
  dict.loadSync(invalidFilePath);

  // Clean up after test
  fs.unlinkSync(invalidFilePath);
} catch (error) {
  if (error instanceof InvalidDictionaryError) {
  } else {
  }
}

// 3. Building a dictionary with empty keys array
try {
  const builder = new Builder();
  builder.build([]);
} catch (error) {
  if (error instanceof BuildError) {
  } else {
  }
}

// 4. Building a dictionary with mismatched keys and values arrays
try {
  const builder = new Builder();
  builder.build(['a', 'b', 'c'], [1, 2]);
} catch (error) {
  if (error instanceof BuildError) {
  } else {
  }
}

// 5. Handling errors in asynchronous API
async function asyncErrorHandling() {
  try {
    const builder = new Builder();
    await builder.buildAndSave(['a', 'b'], '/invalid/path/dict.darts');
  } catch (error) {
    if (error instanceof DartsError) {
    } else {
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

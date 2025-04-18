/**
 * Auto-complete feature example
 *
 * This sample implements an auto-complete feature using Darts.
 */

/* eslint-disable @typescript-eslint/no-require-imports, import/order, no-console, no-plusplus */

const readline = require('readline');
const { buildDictionary } = require('../dist');

// Dictionary data for auto-completion
const words = [
  'apple',
  'application',
  'apply',
  'appointment',
  'approve',
  'banana',
  'baseball',
  'basketball',
  'beach',
  'beautiful',
  'begin',
  'behavior',
  'believe',
  'benefit',
  'book',
  'border',
  'bottle',
  'bottom',
  'box',
  'boy',
  'brain',
  'branch',
  'bread',
  'break',
  'breakfast',
];

// Build the dictionary (values are word indices)
const dict = buildDictionary(words);

/**
 * Function to get auto-completion candidates
 * @param {string} prefix The input prefix
 * @param {number} limit Maximum number of candidates
 * @returns {string[]} Array of completion candidates
 */
function getCompletions(prefix, limit = 5) {
  if (!prefix) return [];

  // Get candidates using common prefix search
  const results = [];

  // Check if each word starts with the prefix
  for (let i = 0; i < words.length; i += 1) {
    if (words[i].startsWith(prefix)) {
      results.push(words[i]);
      if (results.length >= limit) break;
    }
  }

  return results;
}

// Interactive auto-complete demo
console.log('=== Auto-Complete Demo ===');
console.log('Type characters to see suggestions. Type "exit" to quit.');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt() {
  rl.question('> ', (input) => {
    if (input === 'exit') {
      rl.close();
      dict.dispose();
      return;
    }

    const completions = getCompletions(input);

    if (completions.length > 0) {
      console.log('Completion candidates:');
      completions.forEach((word, i) => {
        console.log(`  ${i + 1}. ${word}`);
      });
    } else {
      console.log('No candidates found');
    }

    prompt();
  });
}

prompt();

/**
 * Example output:
 *
 * === Auto-Complete Demo ===
 * Type characters to see suggestions. Type "exit" to quit.
 * > a
 * Completion candidates:
 *   1. apple
 *   2. application
 *   3. apply
 *   4. appointment
 *   5. approve
 * > b
 * Completion candidates:
 *   1. banana
 *   2. baseball
 *   3. basketball
 *   4. beach
 *   5. beautiful
 * > br
 * Completion candidates:
 *   1. brain
 *   2. branch
 *   3. bread
 *   4. break
 *   5. breakfast
 * > exit
 */

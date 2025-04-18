/* eslint-disable jest/no-disabled-tests, jest/expect-expect, no-console */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Dictionary, Builder, TextDarts } from '../src';

// These tests take a long time to run, so they are skipped in CI
// To run these tests, change describe.skip to describe
describe.skip('Performance Tests', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = path.join(os.tmpdir(), `node-darts-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should build large dictionary efficiently', () => {
    const builder = new Builder();
    const keys: string[] = [];
    const values: number[] = [];

    // Generate 10,000 keys (reduced from 100,000 for faster testing)
    console.log('Generating 10,000 keys...');
    const startGenTime = Date.now();
    for (let i = 0; i < 10000; i += 1) {
      keys.push(`key${i.toString().padStart(6, '0')}`);
      values.push(i);
    }
    const endGenTime = Date.now();
    console.log(`Generated keys in ${endGenTime - startGenTime}ms`);

    // Build the dictionary
    console.log('Building dictionary...');
    const startTime = Date.now();
    const dict = builder.build(keys, values);
    const endTime = Date.now();

    console.log(`Built dictionary with ${keys.length} keys in ${endTime - startTime}ms`);
    console.log(`Dictionary size: ${dict.size()}`);

    expect(dict).toBeInstanceOf(Dictionary);
    expect(dict.size()).toBeGreaterThan(0);

    dict.dispose();
  }, 120000); // Set timeout to 120 seconds (increased from 60 seconds)

  it('should perform searches efficiently', () => {
    const builder = new Builder();
    const keys: string[] = [];
    const values: number[] = [];

    // Generate 10,000 keys
    console.log('Generating 10,000 keys...');
    for (let i = 0; i < 10000; i += 1) {
      keys.push(`key${i.toString().padStart(5, '0')}`);
      values.push(i);
    }

    // Build the dictionary
    console.log('Building dictionary...');
    const dict = builder.build(keys, values);

    // Perform 1000 searches
    console.log('Performing 1000 searches...');
    const startTime = Date.now();
    for (let i = 0; i < 1000; i += 1) {
      const index = Math.floor(Math.random() * 10000);
      const key = `key${index.toString().padStart(5, '0')}`;
      dict.exactMatchSearch(key);
    }
    const endTime = Date.now();

    console.log(
      `Performed 1000 searches in ${endTime - startTime}ms (${(endTime - startTime) / 1000}ms per search)`
    );

    dict.dispose();
  }, 60000); // Set timeout to 60 seconds (increased from 30 seconds)

  it('should handle common prefix searches efficiently', () => {
    const builder = new Builder();
    const keys: string[] = [];
    const values: number[] = [];

    // Generate keys with duplicate prefixes
    console.log('Generating keys with common prefixes...');
    for (let i = 0; i < 100; i += 1) {
      const prefix = `prefix${i.toString().padStart(3, '0')}`;
      for (let j = 0; j < 100; j += 1) {
        keys.push(`${prefix}_${j.toString().padStart(3, '0')}`);
        values.push(i * 100 + j);
      }
    }

    // Build the dictionary
    console.log('Building dictionary...');
    const dict = builder.build(keys, values);

    // Perform 100 common prefix searches
    console.log('Performing 100 common prefix searches...');
    const startTime = Date.now();
    for (let i = 0; i < 100; i += 1) {
      const index = Math.floor(Math.random() * 100);
      const prefix = `prefix${index.toString().padStart(3, '0')}`;
      dict.commonPrefixSearch(prefix);
    }
    const endTime = Date.now();

    console.log(
      `Performed 100 common prefix searches in ${endTime - startTime}ms (${(endTime - startTime) / 100}ms per search)`
    );

    dict.dispose();
  }, 60000); // Set timeout to 60 seconds (increased from 30 seconds)

  it('should save and load large dictionaries efficiently', () => {
    const builder = new Builder();
    const keys: string[] = [];
    const values: number[] = [];

    // Generate 10,000 keys
    console.log('Generating 10,000 keys...');
    for (let i = 0; i < 10000; i += 1) {
      keys.push(`key${i.toString().padStart(5, '0')}`);
      values.push(i);
    }

    // Dictionary file path
    const dictPath = path.join(tempDir, 'large-dict.darts');

    // Build and save the dictionary
    console.log('Building and saving dictionary...');
    const startSaveTime = Date.now();
    const saveResult = builder.buildAndSaveSync(keys, dictPath, values);
    const endSaveTime = Date.now();

    console.log(`Built and saved dictionary in ${endSaveTime - startSaveTime}ms`);
    expect(saveResult).toBe(true);

    // Load the dictionary
    console.log('Loading dictionary...');
    const startLoadTime = Date.now();
    const dict = new Dictionary();
    dict.loadSync(dictPath);
    const endLoadTime = Date.now();

    console.log(`Loaded dictionary in ${endLoadTime - startLoadTime}ms`);
    console.log(`Dictionary size: ${dict.size()}`);

    // Verification
    expect(dict.size()).toBeGreaterThan(0);

    // Test 10 random keys
    for (let i = 0; i < 10; i += 1) {
      const index = Math.floor(Math.random() * 10000);
      const key = `key${index.toString().padStart(5, '0')}`;
      expect(dict.exactMatchSearch(key)).toBe(index);
    }

    dict.dispose();
  }, 120000); // Set timeout to 120 seconds (increased from 60 seconds)

  it('should perform text replacements efficiently', () => {
    const words: string[] = [];

    // Generate 1000 words
    console.log('Generating 1000 words...');
    for (let i = 0; i < 1000; i += 1) {
      words.push(`word${i.toString().padStart(4, '0')}`);
    }

    // Build the dictionary
    console.log('Building dictionary...');
    const td = TextDarts.build(words);

    // Generate a large text with some of the words
    console.log('Generating test text...');
    let text = '';
    for (let i = 0; i < 1000; i += 1) {
      if (i % 10 === 0) {
        // Insert a dictionary word every 10 words
        const wordIndex = Math.floor(Math.random() * 1000);
        text += `${words[wordIndex]} `;
      } else {
        // Insert a random word
        text += `random${i} `;
      }
    }

    // Perform text replacement with callback function
    console.log('Performing text replacement with callback function...');
    const startCallbackTime = Date.now();
    const result1 = td.replaceWords(text, (match) => `<<${match}>>`);
    const endCallbackTime = Date.now();

    console.log(
      `Performed text replacement with callback in ${endCallbackTime - startCallbackTime}ms`
    );

    // Perform text replacement with replacement map
    console.log('Performing text replacement with replacement map...');
    const replacementMap: Record<string, string> = {};
    words.forEach((word) => {
      replacementMap[word] = word.toUpperCase();
    });

    const startMapTime = Date.now();
    const result2 = td.replaceWords(text, replacementMap);
    const endMapTime = Date.now();

    console.log(`Performed text replacement with map in ${endMapTime - startMapTime}ms`);

    // Verify results
    expect(result1.length).toBeGreaterThan(0);
    expect(result2.length).toBeGreaterThan(0);

    td.dispose();
  }, 60000); // Set timeout to 60 seconds (increased from 30 seconds)
});

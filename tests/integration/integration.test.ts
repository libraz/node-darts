import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  Builder,
  buildAndSaveDictionary,
  buildAndSaveDictionarySync,
  buildDictionary,
  createDictionary,
  Dictionary,
  loadDictionary,
  type TraverseResult,
} from '../../src';

describe('Integration Tests', () => {
  let tempDir: string;
  let dictPath: string;

  beforeAll(() => {
    // Create a temporary directory for testing
    tempDir = path.join(os.tmpdir(), `node-darts-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Path to the test dictionary file
    dictPath = path.join(tempDir, 'integration-test.darts');
  });

  afterAll(() => {
    // Remove the temporary test directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Dictionary and Builder integration', () => {
    it('should build, save, and load a dictionary', () => {
      // Build a dictionary
      const builder = new Builder();
      const keys = ['apple', 'banana', 'orange', 'pineapple', 'strawberry'];
      const values = [100, 200, 300, 400, 500];

      // Build and save the dictionary
      const result = builder.buildAndSaveSync(keys, dictPath, values);
      expect(result).toBe(true);

      // Load the dictionary
      const dict = new Dictionary();
      dict.loadSync(dictPath);

      // Exact match search
      expect(dict.exactMatchSearch('apple')).toBe(100);
      expect(dict.exactMatchSearch('banana')).toBe(200);
      expect(dict.exactMatchSearch('orange')).toBe(300);
      expect(dict.exactMatchSearch('pineapple')).toBe(400);
      expect(dict.exactMatchSearch('strawberry')).toBe(500);
      expect(dict.exactMatchSearch('grape')).toBe(-1);

      // Common prefix search
      const results = dict.commonPrefixSearch('pineapple');
      // Note: In the actual implementation, searching for 'apple' within 'pine' is not performed
      // Common prefix search only matches when the search key is a prefix of a key in the dictionary
      expect(results).toContain(400); // 'pineapple'

      // Release resources
      dict.dispose();
    });
  });

  describe('Helper functions', () => {
    it('should create a dictionary with createDictionary', () => {
      const dict = createDictionary();
      expect(dict).toBeInstanceOf(Dictionary);
      dict.dispose();
    });

    it('should build a dictionary with buildDictionary', () => {
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, 200, 300];

      const dict = buildDictionary(keys, values);
      expect(dict).toBeInstanceOf(Dictionary);

      expect(dict.exactMatchSearch('apple')).toBe(100);
      expect(dict.exactMatchSearch('banana')).toBe(200);
      expect(dict.exactMatchSearch('orange')).toBe(300);

      dict.dispose();
    });

    it('should build and save a dictionary with buildAndSaveDictionarySync', () => {
      const keys = ['apple', 'banana', 'orange'];
      const syncDictPath = path.join(tempDir, 'sync-helper-test.darts');

      const result = buildAndSaveDictionarySync(keys, syncDictPath);
      expect(result).toBe(true);

      // Verify that the file was created
      expect(fs.existsSync(syncDictPath)).toBe(true);

      // Verify that the created file can be loaded
      const dict = loadDictionary(syncDictPath);

      expect(dict.exactMatchSearch('apple')).toBe(0);
      expect(dict.exactMatchSearch('banana')).toBe(1);
      expect(dict.exactMatchSearch('orange')).toBe(2);

      dict.dispose();
    });

    it('should build and save a dictionary with buildAndSaveDictionary', async () => {
      const keys = ['apple', 'banana', 'orange'];
      const asyncDictPath = path.join(tempDir, 'async-helper-test.darts');

      const result = await buildAndSaveDictionary(keys, asyncDictPath);
      expect(result).toBe(true);

      // Verify that the file was created
      expect(fs.existsSync(asyncDictPath)).toBe(true);

      // Verify that the created file can be loaded
      const dict = loadDictionary(asyncDictPath);

      expect(dict.exactMatchSearch('apple')).toBe(0);
      expect(dict.exactMatchSearch('banana')).toBe(1);
      expect(dict.exactMatchSearch('orange')).toBe(2);

      dict.dispose();
    });
  });

  describe('Memory management', () => {
    it('should handle multiple dictionary instances', () => {
      // Create multiple dictionary instances
      const dicts: Dictionary[] = [];
      for (let i = 0; i < 10; i += 1) {
        dicts.push(createDictionary());
      }

      // Release all dictionaries
      dicts.forEach((dict) => {
        dict.dispose();
      });

      // Verify that a new dictionary can be created
      const newDict = createDictionary();
      expect(newDict).toBeInstanceOf(Dictionary);
      newDict.dispose();
    });
  });

  describe('Traverse functionality', () => {
    it('should traverse the trie structure', () => {
      // Build a dictionary
      const keys = ['apple', 'application', 'banana', 'orange', 'pineapple'];
      const values = [100, 101, 200, 300, 400];

      const dict = buildDictionary(keys, values);

      // Array to store traverse results
      const traverseResults: TraverseResult[] = [];

      // Execute traverse
      dict.traverse('apple', (result) => {
        traverseResults.push({ ...result });
        return true; // Continue processing
      });

      // Verify results: traverse fires once per character of the key.
      expect(traverseResults.length).toBe('apple'.length);

      // The last result should indicate an exact match.
      const lastResult = traverseResults[traverseResults.length - 1];
      expect(lastResult.key).toBe('apple'.length);
      expect(lastResult.value).toBe(100); // Value of 'apple'

      // Test interrupting the process midway after the third character.
      const limitedResults: TraverseResult[] = [];

      dict.traverse('application', (result) => {
        limitedResults.push({ ...result });
        return limitedResults.length < 3;
      });

      // Should have stopped exactly when the callback returned false.
      expect(limitedResults.length).toBe(3);

      dict.dispose();
    });
  });
});

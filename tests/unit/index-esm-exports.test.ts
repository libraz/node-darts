import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  Builder,
  buildAndSaveDictionary,
  buildAndSaveDictionarySync,
  buildDictionary,
  createBuilder,
  createDictionary,
  Dictionary,
  loadDictionary,
  TextDarts,
} from '../../src/index.esm';

/**
 * Tests for the functions exported from src/index.esm.ts.
 */
describe('index.esm.ts Exports', () => {
  let tempDir: string;
  let dictPath: string;

  beforeAll(() => {
    tempDir = path.join(os.tmpdir(), `node-darts-esm-exports-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    dictPath = path.join(tempDir, 'test-esm-exports.darts');
  });

  afterAll(() => {
    // Remove the temporary test directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('createDictionary', () => {
    it('should create a dictionary instance', () => {
      const dict = createDictionary();
      expect(dict).toBeInstanceOf(Dictionary);

      // Clean up
      dict.dispose();
    });
  });

  describe('createBuilder', () => {
    it('should create a builder instance', () => {
      const builder = createBuilder();
      expect(builder).toBeInstanceOf(Builder);
    });
  });

  describe('loadDictionary', () => {
    it('should load a dictionary from a file', async () => {
      // First create and save a dictionary
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, 200, 300];

      await buildAndSaveDictionary(keys, dictPath, values);

      // Now load the dictionary
      const dict = await loadDictionary(dictPath);
      expect(dict).toBeInstanceOf(Dictionary);

      // Verify the loaded dictionary
      expect(dict.exactMatchSearch('apple')).toBe(100);
      expect(dict.exactMatchSearch('banana')).toBe(200);
      expect(dict.exactMatchSearch('orange')).toBe(300);

      // Clean up
      dict.dispose();
    });
  });

  describe('buildDictionary', () => {
    it('should build a dictionary from keys', () => {
      const keys = ['apple', 'banana', 'orange'];
      const dict = buildDictionary(keys);
      expect(dict).toBeInstanceOf(Dictionary);

      // Verify the dictionary
      expect(dict.exactMatchSearch('apple')).toBe(0);
      expect(dict.exactMatchSearch('banana')).toBe(1);
      expect(dict.exactMatchSearch('orange')).toBe(2);

      // Clean up
      dict.dispose();
    });

    it('should build a dictionary with custom values', () => {
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, 200, 300];
      const dict = buildDictionary(keys, values);
      expect(dict).toBeInstanceOf(Dictionary);

      // Verify the dictionary
      expect(dict.exactMatchSearch('apple')).toBe(100);
      expect(dict.exactMatchSearch('banana')).toBe(200);
      expect(dict.exactMatchSearch('orange')).toBe(300);

      // Clean up
      dict.dispose();
    });
  });

  describe('buildAndSaveDictionary', () => {
    it('should build and save a dictionary asynchronously', async () => {
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, 200, 300];

      // Build and save the dictionary
      await buildAndSaveDictionary(keys, dictPath, values);
      expect(fs.existsSync(dictPath)).toBe(true);

      // Load the dictionary to verify
      const dict = await loadDictionary(dictPath);
      expect(dict.exactMatchSearch('apple')).toBe(100);
      expect(dict.exactMatchSearch('banana')).toBe(200);
      expect(dict.exactMatchSearch('orange')).toBe(300);

      // Clean up
      dict.dispose();
    });
  });

  describe('buildAndSaveDictionarySync', () => {
    it('should build and save a dictionary synchronously', () => {
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, 200, 300];

      // Build and save the dictionary
      buildAndSaveDictionarySync(keys, dictPath, values);
      expect(fs.existsSync(dictPath)).toBe(true);

      // Load the dictionary to verify
      const dict = new Dictionary();
      dict.loadSync(dictPath);
      expect(dict.exactMatchSearch('apple')).toBe(100);
      expect(dict.exactMatchSearch('banana')).toBe(200);
      expect(dict.exactMatchSearch('orange')).toBe(300);

      // Clean up
      dict.dispose();
    });
  });

  describe('TextDarts', () => {
    it('should create a TextDarts instance', () => {
      // Use static method to create instance
      const textDarts = TextDarts.new(['apple', 'banana', 'orange']);
      expect(textDarts).toBeInstanceOf(TextDarts);

      // Test replaceWords with replacement map
      expect(
        textDarts.replaceWords('I have an apple and a banana', {
          apple: '*',
          banana: '*',
        })
      ).toBe('I have an * and a *');

      // Test exactMatchSearch
      expect(textDarts.exactMatchSearch('apple')).toBe(0);
      expect(textDarts.exactMatchSearch('banana')).toBe(1);
      expect(textDarts.exactMatchSearch('orange')).toBe(2);

      // Clean up
      textDarts.dispose();
    });
  });
});

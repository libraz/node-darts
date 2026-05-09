import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Builder, buildDictionary, Dictionary, FileNotFoundError } from '../../../src';

describe('Dictionary', () => {
  let tempDir: string;
  let dictPath: string;

  beforeAll(() => {
    // Create a temporary directory for testing
    tempDir = path.join(os.tmpdir(), `node-darts-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Path to the test dictionary file
    dictPath = path.join(tempDir, 'test.darts');
  });

  afterAll(() => {
    // Remove the temporary test directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create a new Dictionary instance', () => {
      const dict = new Dictionary();
      expect(dict).toBeInstanceOf(Dictionary);
    });
  });

  describe('loadSync', () => {
    it('should throw FileNotFoundError when file does not exist', () => {
      const dict = new Dictionary();
      const nonExistentPath = path.join(tempDir, 'non-existent.darts');

      expect(() => {
        dict.loadSync(nonExistentPath);
      }).toThrow(FileNotFoundError);
    });

    it('should create a dictionary file and load it successfully', () => {
      // Create a simple dictionary file for testing
      const builder = new Builder();
      builder.buildAndSaveSync(['test', 'example'], dictPath);

      // Load the dictionary
      const dict = new Dictionary();
      dict.loadSync(dictPath);

      // Verify it loaded correctly
      // After changing to default exports, the order might have changed
      const testValue = dict.exactMatchSearch('test');
      const exampleValue = dict.exactMatchSearch('example');

      // Ensure both values are found (values are either 0 or 1)
      expect(testValue).toBeGreaterThanOrEqual(0);
      expect(testValue).toBeLessThanOrEqual(1);
      expect(exampleValue).toBeGreaterThanOrEqual(0);
      expect(exampleValue).toBeLessThanOrEqual(1);

      // Ensure values are different
      expect(testValue).not.toBe(exampleValue);

      // Clean up
      dict.dispose();
    });
  });

  describe('exactMatchSearch', () => {
    it('should return -1 for non-existent key in empty dictionary', () => {
      const dict = new Dictionary();
      const result = dict.exactMatchSearch('test');
      expect(result).toBe(-1);
    });
  });

  describe('commonPrefixSearch', () => {
    it('should return empty array for non-existent key in empty dictionary', () => {
      const dict = new Dictionary();
      const result = dict.commonPrefixSearch('test');
      expect(result).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return 0 for empty dictionary', () => {
      const dict = new Dictionary();
      const size = dict.size();
      expect(size).toBe(0);
    });
  });

  describe('replaceWords', () => {
    let dict: Dictionary;
    const words = ['apple', 'banana', 'orange', 'pineapple'];

    beforeEach(() => {
      dict = buildDictionary(words);
    });

    afterEach(() => {
      dict.dispose();
    });

    it('should replace words using callback function', () => {
      const text = 'I like apple and pineapple';
      const result = dict.replaceWords(text, (match) => `<<${match}>>`);
      expect(result).toBe('I like <<apple>> and <<pineapple>>');
    });

    it('should replace words using replacement map', () => {
      const text = 'I like apple and banana';
      const replacementMap: Record<string, string> = {
        apple: 'APPLE',
        banana: 'BANANA',
      };
      const result = dict.replaceWords(text, replacementMap);
      expect(result).toBe('I like APPLE and BANANA');
    });

    it('should handle overlapping words correctly', () => {
      // Create a dictionary with overlapping words
      const overlapDict = buildDictionary(['app', 'apple', 'pineapple']);
      const text = 'app apple pineapple';
      const result = overlapDict.replaceWords(text, (match) => `[${match}]`);
      // Should match the longest word at each position
      expect(result).toBe('[app] [apple] [pineapple]');
      overlapDict.dispose();
    });

    it('should not replace anything if no matches found', () => {
      const text = 'I like grapes';
      const result = dict.replaceWords(text, (match) => `<<${match}>>`);
      expect(result).toBe('I like grapes');
    });

    it('should keep the original word when the replacement map has no entry for it', () => {
      // 'banana' is in the dictionary so it gets matched, but the map only has
      // an entry for 'apple'. The `replacer[match] ?? match` fallback should
      // re-emit 'banana' verbatim rather than 'undefined'.
      const text = 'I like apple and banana';
      const replacementMap: Record<string, string> = { apple: 'APPLE' };
      const result = dict.replaceWords(text, replacementMap);
      expect(result).toBe('I like APPLE and banana');
    });
  });

  describe('dispose', () => {
    it('should dispose the dictionary', () => {
      const dict = new Dictionary();
      dict.dispose();

      // Method calls after dispose should throw an error
      expect(() => {
        dict.size();
      }).toThrow();
    });

    it('should be a no-op when called a second time', () => {
      const dict = new Dictionary();
      dict.dispose();
      // Second dispose must not throw or call into the destroyed handle.
      expect(() => dict.dispose()).not.toThrow();
      expect(dict.disposed).toBe(true);
    });
  });

  describe('disposed flag', () => {
    it('should reflect dispose state', () => {
      const dict = new Dictionary();
      expect(dict.disposed).toBe(false);
      dict.dispose();
      expect(dict.disposed).toBe(true);
    });
  });
});

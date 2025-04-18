import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { dartsNative } from '../src/core/native';
import { FileNotFoundError, BuildError } from '../src/core/errors';

describe('DartsNativeWrapper', () => {
  let tempDir: string;
  let dictPath: string;
  let handle: number;

  beforeAll(() => {
    // Create a temporary directory for testing
    tempDir = path.join(os.tmpdir(), `node-darts-native-test-${Date.now()}`);
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

  beforeEach(() => {
    // Create a new dictionary for each test
    handle = dartsNative.createDictionary();
  });

  afterEach(() => {
    // Clean up the dictionary after each test
    try {
      dartsNative.destroyDictionary(handle);
    } catch {
      // Ignore errors during cleanup
    }
  });

  describe('createDictionary', () => {
    it('should create a dictionary and return a valid handle', () => {
      const newHandle = dartsNative.createDictionary();
      expect(newHandle).toBeGreaterThan(0);

      // Clean up
      dartsNative.destroyDictionary(newHandle);
    });
  });

  describe('destroyDictionary', () => {
    it('should destroy a dictionary without errors', () => {
      const newHandle = dartsNative.createDictionary();
      expect(() => {
        dartsNative.destroyDictionary(newHandle);
      }).not.toThrow();
    });
  });

  describe('build', () => {
    it('should build a dictionary from keys', () => {
      const keys = ['apple', 'banana', 'orange'];
      const newHandle = dartsNative.build(keys);

      expect(newHandle).toBeGreaterThan(0);
      expect(dartsNative.exactMatchSearch(newHandle, 'apple')).toBe(0);
      expect(dartsNative.exactMatchSearch(newHandle, 'banana')).toBe(1);
      expect(dartsNative.exactMatchSearch(newHandle, 'orange')).toBe(2);

      // Clean up
      dartsNative.destroyDictionary(newHandle);
    });

    it('should build a dictionary with custom values', () => {
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, 200, 300];
      const newHandle = dartsNative.build(keys, values);

      expect(newHandle).toBeGreaterThan(0);
      expect(dartsNative.exactMatchSearch(newHandle, 'apple')).toBe(100);
      expect(dartsNative.exactMatchSearch(newHandle, 'banana')).toBe(200);
      expect(dartsNative.exactMatchSearch(newHandle, 'orange')).toBe(300);

      // Clean up
      dartsNative.destroyDictionary(newHandle);
    });

    it('should throw error when building with empty keys', () => {
      expect(() => {
        dartsNative.build([]);
      }).toThrow(BuildError);
    });

    it('should throw error when keys and values have different lengths', () => {
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, 200];

      expect(() => {
        dartsNative.build(keys, values);
      }).toThrow(BuildError);
    });

    it('should throw error when keys contain non-string values', () => {
      const keys = ['apple', 123 as unknown as string, 'orange'];

      expect(() => {
        dartsNative.build(keys);
      }).toThrow(BuildError);
    });

    it('should throw error when values contain non-number values', () => {
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, '200' as unknown as number, 300];

      expect(() => {
        dartsNative.build(keys, values);
      }).toThrow(BuildError);
    });
  });

  describe('saveDictionary and loadDictionary', () => {
    it('should save and load a dictionary', () => {
      // Build a dictionary
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, 200, 300];
      const buildHandle = dartsNative.build(keys, values);

      // Save the dictionary
      const saveResult = dartsNative.saveDictionary(buildHandle, dictPath);
      expect(saveResult).toBe(true);
      expect(fs.existsSync(dictPath)).toBe(true);

      // Load the dictionary
      const loadResult = dartsNative.loadDictionary(handle, dictPath);
      expect(loadResult).toBe(true);

      // Verify the loaded dictionary
      expect(dartsNative.exactMatchSearch(handle, 'apple')).toBe(100);
      expect(dartsNative.exactMatchSearch(handle, 'banana')).toBe(200);
      expect(dartsNative.exactMatchSearch(handle, 'orange')).toBe(300);

      // Clean up
      dartsNative.destroyDictionary(buildHandle);
    });

    it('should throw FileNotFoundError when loading non-existent file', () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.darts');

      expect(() => {
        dartsNative.loadDictionary(handle, nonExistentPath);
      }).toThrow(FileNotFoundError);
    });
  });

  describe('exactMatchSearch', () => {
    it('should find exact matches', () => {
      // Build a dictionary
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, 200, 300];
      const buildHandle = dartsNative.build(keys, values);

      // Test exact match search
      expect(dartsNative.exactMatchSearch(buildHandle, 'apple')).toBe(100);
      expect(dartsNative.exactMatchSearch(buildHandle, 'banana')).toBe(200);
      expect(dartsNative.exactMatchSearch(buildHandle, 'orange')).toBe(300);
      expect(dartsNative.exactMatchSearch(buildHandle, 'grape')).toBe(-1); // Not found

      // Clean up
      dartsNative.destroyDictionary(buildHandle);
    });
  });

  describe('commonPrefixSearch', () => {
    it('should find common prefixes', () => {
      // Build a dictionary with prefixes
      const keys = ['a', 'ab', 'abc', 'abcd'];
      const values = [1, 2, 3, 4];
      const buildHandle = dartsNative.build(keys, values);

      // Test common prefix search
      const results = dartsNative.commonPrefixSearch(buildHandle, 'abcde');
      expect(results).toEqual([1, 2, 3, 4]); // All are prefixes of 'abcde'

      const partialResults = dartsNative.commonPrefixSearch(buildHandle, 'abc');
      expect(partialResults).toEqual([1, 2, 3]); // 'a', 'ab', 'abc' are prefixes of 'abc'

      const noResults = dartsNative.commonPrefixSearch(buildHandle, 'x');
      expect(noResults).toEqual([]); // No prefixes found

      // Clean up
      dartsNative.destroyDictionary(buildHandle);
    });
  });

  describe('size', () => {
    it('should return a positive size for a non-empty dictionary', () => {
      // Build a dictionary
      const keys = ['apple', 'banana', 'orange'];
      const buildHandle = dartsNative.build(keys);

      // Test size - DARTS internal size is larger than the number of keys
      // due to its double-array structure
      const size = dartsNative.size(buildHandle);
      expect(size).toBeGreaterThan(0);

      // Clean up
      dartsNative.destroyDictionary(buildHandle);
    });

    it('should return 0 for empty dictionary', () => {
      // Empty dictionary
      expect(dartsNative.size(handle)).toBe(0);
    });
  });

  describe('traverse', () => {
    it('should traverse the trie and call the callback for each node', () => {
      // Build a dictionary
      const keys = ['a', 'ab', 'abc'];
      const values = [1, 2, 3];
      const buildHandle = dartsNative.build(keys, values);

      // Mock callback
      const callback = jest.fn();

      // Traverse with 'a' as the key
      dartsNative.traverse(buildHandle, 'a', callback);

      // Callback should be called at least once
      expect(callback).toHaveBeenCalled();

      // Clean up
      dartsNative.destroyDictionary(buildHandle);
    });
  });
});

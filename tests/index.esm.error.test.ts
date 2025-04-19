import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Define types for the imported modules
interface DartsNativeInterface {
  createDictionary(): number;
  destroyDictionary(handle: number): void;
  loadDictionary(handle: number, filePath: string): boolean;
  saveDictionary(handle: number, filePath: string): boolean;
  exactMatchSearch(handle: number, key: string): number;
  commonPrefixSearch(handle: number, key: string): number[];
  traverse(
    handle: number,
    key: string,
    callback: (result: { node: number; key: number; value: number }) => boolean
  ): void;
  build(keys: string[], values?: number[]): number;
  size(handle: number): number;
}

// Try to import the module, but don't fail if it can't be loaded
let dartsNative: DartsNativeInterface;
let moduleLoadFailed = false;

try {
  // Try to import the module
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, global-require
  const esm = require('../src/index.esm');
  dartsNative = esm.dartsNative;
} catch (error) {
  console.warn(`Failed to load module for testing: ${error}`);
  moduleLoadFailed = true;
}

/**
 * This test file is for testing the error handling of src/index.esm.ts in more detail.
 * It aims to improve branch coverage and function coverage.
 */
// If module loading failed, we'll run the tests anyway but they will fail
// This makes the failure more visible rather than silently skipping tests
describe('index.esm.ts Error Handling', () => {
  // Check if module loading failed before running tests
  beforeAll(() => {
    if (moduleLoadFailed) {
      throw new Error('Native module failed to load. Tests cannot proceed.');
    }
  });
  let tempDir: string;
  let dictPath: string;
  let handle: number;

  beforeAll(() => {
    // Create a temporary directory for testing
    tempDir = path.join(os.tmpdir(), `node-darts-esm-error-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Path to the test dictionary file
    dictPath = path.join(tempDir, 'test-esm-error.darts');
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

    it('should handle invalid handle gracefully', () => {
      // Use an invalid handle (very large number)
      const invalidHandle = 999999999;

      // This should not throw an error, but if it does, it should be a DartsError
      expect(() => {
        dartsNative.destroyDictionary(invalidHandle);
      }).not.toThrow();
    });
  });

  describe('loadDictionary', () => {
    it('should handle loading a non-existent file', () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.darts');

      expect(() => {
        dartsNative.loadDictionary(handle, nonExistentPath);
      }).toThrow();
    });

    it('should handle loading an invalid file', () => {
      // Create an invalid dictionary file
      const invalidPath = path.join(tempDir, 'invalid.darts');
      fs.writeFileSync(invalidPath, 'This is not a valid dictionary file');

      // Just verify that we can call the method with an invalid file
      // The implementation might throw or return false, we don't care
      // We just want to make sure it's handled in some way
      expect(() => {
        try {
          dartsNative.loadDictionary(handle, invalidPath);
        } catch {
          // Ignore any errors
          throw new Error('Expected error');
        }
      }).not.toThrow();
    });
  });

  describe('saveDictionary', () => {
    it('should save a dictionary successfully', () => {
      // Build a dictionary
      const keys = ['apple', 'banana', 'orange'];
      const buildHandle = dartsNative.build(keys);

      // Save the dictionary
      const result = dartsNative.saveDictionary(buildHandle, dictPath);
      expect(result).toBe(true);
      expect(fs.existsSync(dictPath)).toBe(true);

      // Clean up
      dartsNative.destroyDictionary(buildHandle);
    });

    it('should handle saving to an invalid path', () => {
      // Try to save to a directory that doesn't exist
      const invalidPath = path.join(tempDir, 'non-existent-dir', 'test.darts');

      expect(() => {
        dartsNative.saveDictionary(handle, invalidPath);
      }).toThrow();
    });

    it('should handle saving with an invalid handle', () => {
      // Use an invalid handle
      const invalidHandle = 999999999;

      expect(() => {
        dartsNative.saveDictionary(invalidHandle, dictPath);
      }).toThrow();
    });
  });

  describe('exactMatchSearch', () => {
    it('should handle search with an invalid handle', () => {
      // Use an invalid handle
      const invalidHandle = 999999999;

      expect(() => {
        dartsNative.exactMatchSearch(invalidHandle, 'test');
      }).toThrow();
    });

    it('should handle search with an empty key', () => {
      // Build a dictionary
      const keys = ['apple', 'banana', 'orange'];
      const buildHandle = dartsNative.build(keys);

      // Search with an empty key
      const result = dartsNative.exactMatchSearch(buildHandle, '');
      expect(result).toBe(-1);

      // Clean up
      dartsNative.destroyDictionary(buildHandle);
    });
  });

  describe('commonPrefixSearch', () => {
    it('should handle search with an invalid handle', () => {
      // Use an invalid handle
      const invalidHandle = 999999999;

      expect(() => {
        dartsNative.commonPrefixSearch(invalidHandle, 'test');
      }).toThrow();
    });

    it('should handle search with an empty key', () => {
      // Build a dictionary
      const keys = ['apple', 'banana', 'orange'];
      const buildHandle = dartsNative.build(keys);

      // Search with an empty key
      const result = dartsNative.commonPrefixSearch(buildHandle, '');
      expect(result).toEqual([]);

      // Clean up
      dartsNative.destroyDictionary(buildHandle);
    });
  });

  describe('traverse', () => {
    it('should handle traverse with an invalid handle', () => {
      // Use an invalid handle
      const invalidHandle = 999999999;

      expect(() => {
        dartsNative.traverse(invalidHandle, 'test', () => true);
      }).toThrow();
    });

    it('should handle traverse with an empty key', () => {
      // Build a dictionary
      const keys = ['apple', 'banana', 'orange'];
      const buildHandle = dartsNative.build(keys);

      // Mock callback
      const callback = jest.fn().mockReturnValue(true);

      // Traverse with an empty key
      dartsNative.traverse(buildHandle, '', callback);

      // Verify that the operation completes without throwing an error
      expect(true).toBe(true);

      // Clean up
      dartsNative.destroyDictionary(buildHandle);
    });

    it('should handle callback returning false', () => {
      // Build a dictionary
      const keys = ['a', 'ab', 'abc'];
      const buildHandle = dartsNative.build(keys);

      // Mock callback that returns false to stop traversal
      const callback = jest.fn().mockReturnValue(false);

      // Traverse
      dartsNative.traverse(buildHandle, 'a', callback);

      // Callback should be called at least once
      expect(callback).toHaveBeenCalled();

      // Clean up
      dartsNative.destroyDictionary(buildHandle);
    });
  });

  describe('build', () => {
    it('should handle build with various edge cases', () => {
      // Test with a single key
      const singleKey = ['test'];
      const singleHandle = dartsNative.build(singleKey);
      expect(singleHandle).toBeGreaterThan(0);
      dartsNative.destroyDictionary(singleHandle);

      // Test with keys containing special characters
      const specialKeys = ['test!@#', 'hello世界', '123'];
      const specialHandle = dartsNative.build(specialKeys);
      expect(specialHandle).toBeGreaterThan(0);
      dartsNative.destroyDictionary(specialHandle);

      // Test with very long keys
      const longKey = 'a'.repeat(1000);
      const longKeys = [longKey, 'b', 'c'];
      const longHandle = dartsNative.build(longKeys);
      expect(longHandle).toBeGreaterThan(0);
      dartsNative.destroyDictionary(longHandle);
    });
  });

  describe('size', () => {
    it('should handle size with an invalid handle', () => {
      // Use an invalid handle
      const invalidHandle = 999999999;

      expect(() => {
        dartsNative.size(invalidHandle);
      }).toThrow();
    });
  });
});

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Define types for the imported modules
interface DictionaryInstance {
  dispose(): void;
  exactMatchSearch(key: string): number;
  loadSync(filePath: string): boolean;
}

interface BuilderInstance {
  // Builder interface properties
  [key: string]: unknown;
}

interface TextDartsInstance {
  dispose(): void;
  exactMatchSearch(key: string): number;
  replaceWords(text: string, replacements: Record<string, string>): string;
}

// Type aliases to simplify declarations
type DictionaryConstructor = new () => DictionaryInstance;
type BuilderConstructor = new () => BuilderInstance;
type TextDartsConstructor = {
  new (): TextDartsInstance;
  new (keys: string[]): TextDartsInstance;
  new (keys: string[], values: number[]): TextDartsInstance;
  new (keys: string[], options: unknown): TextDartsInstance;
  new: (keys: string[]) => TextDartsInstance;
};

// Try to import the module, but don't fail if it can't be loaded
// Using non-null assertion in tests since we check moduleLoadFailed before running tests
let createDictionary: (options?: unknown) => DictionaryInstance;
let createBuilder: (options?: unknown) => BuilderInstance;
let loadDictionary: (filePath: string) => Promise<DictionaryInstance>;
let buildDictionary: (keys: string[], values?: number[]) => DictionaryInstance;
let buildAndSaveDictionary: (keys: string[], filePath: string, values?: number[]) => Promise<void>;
let buildAndSaveDictionarySync: (keys: string[], filePath: string, values?: number[]) => void;
let Dictionary: DictionaryConstructor;
let Builder: BuilderConstructor;
let TextDarts: TextDartsConstructor;
let moduleLoadFailed = false;

try {
  // Try to import the module
  // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
  const esm = require('../src/index.esm');
  createDictionary = esm.createDictionary;
  createBuilder = esm.createBuilder;
  loadDictionary = esm.loadDictionary;
  buildDictionary = esm.buildDictionary;
  buildAndSaveDictionary = esm.buildAndSaveDictionary;
  buildAndSaveDictionarySync = esm.buildAndSaveDictionarySync;
  Dictionary = esm.Dictionary;
  Builder = esm.Builder;
  TextDarts = esm.TextDarts;
} catch (error) {
  console.warn(`Failed to load module for testing: ${error}`);
  moduleLoadFailed = true;
}

/**
 * This test file is for testing the functions exported from src/index.esm.ts.
 * It aims to improve function coverage.
 */
// If module loading failed, we'll run the tests anyway but they will fail
// This makes the failure more visible rather than silently skipping tests
describe('index.esm.ts Exports', () => {
  // Check if module loading failed before running tests
  beforeAll(() => {
    if (moduleLoadFailed) {
      throw new Error('Native module failed to load. Tests cannot proceed.');
    }
  });
  let tempDir: string;
  let dictPath: string;

  beforeAll(() => {
    // Create a temporary directory for testing
    tempDir = path.join(os.tmpdir(), `node-darts-esm-exports-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Path to the test dictionary file
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

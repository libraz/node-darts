import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { TextDarts, FileNotFoundError } from '../src';

describe('TextDarts', () => {
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

  describe('new', () => {
    it('should create a new TextDarts instance from word list', () => {
      const words = ['apple', 'banana', 'orange'];
      const td = TextDarts.new(words);
      expect(td).toBeInstanceOf(TextDarts);
      td.dispose();
    });

    it('should throw error when creating from non-existent file', () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.darts');

      expect(() => {
        TextDarts.new(nonExistentPath);
      }).toThrow(FileNotFoundError);
    });
  });

  describe('build', () => {
    it('should build a dictionary from word list', () => {
      const words = ['apple', 'banana', 'orange'];
      const td = TextDarts.build(words);
      expect(td).toBeInstanceOf(TextDarts);

      // Test exact match search
      expect(td.exactMatchSearch('apple')).toBe(0);
      expect(td.exactMatchSearch('banana')).toBe(1);
      expect(td.exactMatchSearch('orange')).toBe(2);
      expect(td.exactMatchSearch('grape')).toBe(-1);

      td.dispose();
    });

    it('should build a dictionary with custom values', () => {
      const words = ['apple', 'banana', 'orange'];
      const values = [100, 200, 300];
      const td = TextDarts.build(words, values);

      expect(td.exactMatchSearch('apple')).toBe(100);
      expect(td.exactMatchSearch('banana')).toBe(200);
      expect(td.exactMatchSearch('orange')).toBe(300);

      td.dispose();
    });
  });

  describe('buildAndSaveSync', () => {
    it('should build and save a dictionary', () => {
      const words = ['apple', 'banana', 'orange'];
      const result = TextDarts.buildAndSaveSync(words, dictPath);
      expect(result).toBe(true);
      expect(fs.existsSync(dictPath)).toBe(true);
    });
  });

  describe('load', () => {
    it('should load a dictionary from file', () => {
      const td = TextDarts.load(dictPath);
      expect(td).toBeInstanceOf(TextDarts);

      // Test exact match search
      expect(td.exactMatchSearch('apple')).toBe(0);
      expect(td.exactMatchSearch('banana')).toBe(1);
      expect(td.exactMatchSearch('orange')).toBe(2);

      td.dispose();
    });
  });

  describe('instance load methods', () => {
    let td: TextDarts;

    beforeEach(() => {
      // Create a new TextDarts instance for each test
      td = TextDarts.build(['test']);
    });

    afterEach(() => {
      // Clean up after each test
      td.dispose();
    });

    it('should load a dictionary asynchronously', async () => {
      // First build and save a dictionary
      const words = ['apple', 'banana', 'orange'];
      TextDarts.buildAndSaveSync(words, dictPath);

      // Then load it using the instance method
      const result = await td.load(dictPath);
      expect(result).toBe(true);

      // Test that the dictionary was loaded correctly
      expect(td.exactMatchSearch('apple')).toBe(0);
      expect(td.exactMatchSearch('banana')).toBe(1);
      expect(td.exactMatchSearch('orange')).toBe(2);
    });

    it('should load a dictionary synchronously', () => {
      // First build and save a dictionary
      const words = ['apple', 'banana', 'orange'];
      TextDarts.buildAndSaveSync(words, dictPath);

      // Then load it using the instance method
      const result = td.loadSync(dictPath);
      expect(result).toBe(true);

      // Test that the dictionary was loaded correctly
      expect(td.exactMatchSearch('apple')).toBe(0);
      expect(td.exactMatchSearch('banana')).toBe(1);
      expect(td.exactMatchSearch('orange')).toBe(2);
    });

    it('should throw error when loading non-existent file asynchronously', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.darts');

      await expect(td.load(nonExistentPath)).rejects.toThrow(FileNotFoundError);
    });

    it('should throw error when loading non-existent file synchronously', () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.darts');

      expect(() => {
        td.loadSync(nonExistentPath);
      }).toThrow(FileNotFoundError);
    });
  });

  describe('replaceWords', () => {
    let td: TextDarts;
    const words = ['apple', 'banana', 'orange', 'pineapple'];

    beforeEach(() => {
      td = TextDarts.build(words);
    });

    afterEach(() => {
      td.dispose();
    });

    it('should replace words using callback function', () => {
      const text = 'I like apple and pineapple';
      const result = td.replaceWords(text, (match) => `<<${match}>>`);
      expect(result).toBe('I like <<apple>> and <<pineapple>>');
    });

    it('should replace words using replacement map', () => {
      const text = 'I like apple and banana';
      const replacementMap: Record<string, string> = {
        apple: 'APPLE',
        banana: 'BANANA',
      };
      const result = td.replaceWords(text, replacementMap);
      expect(result).toBe('I like APPLE and BANANA');
    });

    it('should handle overlapping words correctly', () => {
      // Create a dictionary with overlapping words
      const overlapTd = TextDarts.build(['app', 'apple', 'pineapple']);
      const text = 'app apple pineapple';
      const result = overlapTd.replaceWords(text, (match) => `[${match}]`);
      // Should match the longest word at each position
      expect(result).toBe('[app] [apple] [pineapple]');
      overlapTd.dispose();
    });

    it('should not replace anything if no matches found', () => {
      const text = 'I like grapes';
      const result = td.replaceWords(text, (match) => `<<${match}>>`);
      expect(result).toBe('I like grapes');
    });
  });

  describe('commonPrefixSearch', () => {
    it('should find all common prefixes', () => {
      const td = TextDarts.build(['a', 'ab', 'abc', 'abcd']);

      const result1 = td.commonPrefixSearch('a');
      expect(result1).toEqual([0]);

      const result2 = td.commonPrefixSearch('ab');
      expect(result2).toEqual([0, 1]);

      const result3 = td.commonPrefixSearch('abc');
      expect(result3).toEqual([0, 1, 2]);

      const result4 = td.commonPrefixSearch('abcd');
      expect(result4).toEqual([0, 1, 2, 3]);

      const result5 = td.commonPrefixSearch('abcde');
      expect(result5).toEqual([0, 1, 2, 3]);

      td.dispose();
    });
  });

  describe('traverse', () => {
    it('should traverse the trie', () => {
      const td = TextDarts.build(['a', 'ab', 'abc']);
      const results: Array<{ node: number; key: number; value: number }> = [];

      td.traverse('abc', (result) => {
        results.push({ ...result });
        return true;
      });

      expect(results.length).toBeGreaterThan(0);
      td.dispose();
    });
  });

  describe('size', () => {
    it('should return the size of the dictionary from words array', () => {
      const words = ['apple', 'banana', 'orange'];
      const td = TextDarts.build(words);

      expect(td.size()).toBe(3);
      td.dispose();
    });

    it('should return the size from dictionary when words array is not available', async () => {
      // Create a dictionary without words array by loading from file
      TextDarts.buildAndSaveSync(['apple', 'banana', 'orange'], dictPath);

      // Load the dictionary - this doesn't set the words array
      const td = TextDarts.load(dictPath);

      // Size should still work by falling back to dictionary.size()
      expect(td.size()).toBeGreaterThan(0);

      td.dispose();
    });
  });

  describe('dispose', () => {
    it('should dispose the dictionary', () => {
      const td = TextDarts.build(['apple']);
      td.dispose();

      // Method calls after dispose should throw an error
      expect(() => {
        td.size();
      }).toThrow();
    });

    it('should do nothing when called multiple times', () => {
      const td = TextDarts.build(['apple']);

      // First dispose should work
      expect(() => {
        td.dispose();
      }).not.toThrow();

      // Second dispose should do nothing and not throw
      expect(() => {
        td.dispose();
      }).not.toThrow();
    });
  });

  describe('internal methods', () => {
    it('should access dictionary through _dictionary getter', () => {
      const td = TextDarts.build(['apple']);

      // Access the internal dictionary through the getter
      // eslint-disable-next-line no-underscore-dangle
      const dictionary = td._dictionary;

      // Should be a Dictionary instance
      expect(dictionary).toBeDefined();

      td.dispose();

      // After dispose, _dictionary getter should throw
      expect(() => {
        // eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-unused-vars
        const _ = td._dictionary;
      }).toThrow();
    });
  });

  // Note: We can't directly test FinalizationRegistry as it's triggered by garbage collection
  // Instead, we'll test the dispose method which should clean up resources
  describe('Resource cleanup', () => {
    it('should clean up resources when dispose is called', () => {
      // Create a spy on dartsNative.destroyDictionary
      const destroySpy = jest.spyOn(
        jest.requireActual('../src/core/native').dartsNative,
        'destroyDictionary'
      );

      // Create a TextDarts instance
      const td = TextDarts.build(['apple']);

      // Get the handle from the internal dictionary
      // eslint-disable-next-line no-underscore-dangle
      td._dictionary.getHandle();

      // Call dispose
      td.dispose();

      // Verify that destroyDictionary was called
      expect(destroySpy).toHaveBeenCalled();

      // Restore the original method
      destroySpy.mockRestore();
    });
  });
});

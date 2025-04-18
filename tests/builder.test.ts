import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Builder, Dictionary, BuildError } from '../src';

describe('Builder', () => {
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
    it('should create a new Builder instance', () => {
      const builder = new Builder();
      expect(builder).toBeInstanceOf(Builder);
    });
  });

  describe('build', () => {
    it('should build a dictionary from keys', () => {
      const builder = new Builder();
      const keys = ['apple', 'banana', 'orange'];

      const dict = builder.build(keys);
      expect(dict).toBeInstanceOf(Dictionary);

      // Test exact match search
      expect(dict.exactMatchSearch('apple')).toBe(0);
      expect(dict.exactMatchSearch('banana')).toBe(1);
      expect(dict.exactMatchSearch('orange')).toBe(2);

      dict.dispose();
    });

    it('should build a dictionary with custom values', () => {
      const builder = new Builder();
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, 200, 300];

      const dict = builder.build(keys, values);

      expect(dict.exactMatchSearch('apple')).toBe(100);
      expect(dict.exactMatchSearch('banana')).toBe(200);
      expect(dict.exactMatchSearch('orange')).toBe(300);

      dict.dispose();
    });

    it('should throw error when building with empty keys', () => {
      const builder = new Builder();

      expect(() => {
        builder.build([]);
      }).toThrow(BuildError);
    });

    it('should throw error when keys and values have different lengths', () => {
      const builder = new Builder();
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, 200];

      expect(() => {
        builder.build(keys, values);
      }).toThrow(BuildError);
    });

    it('should throw error when keys contain non-string values', () => {
      const builder = new Builder();
      const keys = ['apple', 123 as unknown as string, 'orange'];

      expect(() => {
        builder.build(keys);
      }).toThrow(BuildError);
      expect(() => {
        builder.build(keys);
      }).toThrow('All keys must be strings');
    });

    it('should throw error when values contain non-number values', () => {
      const builder = new Builder();
      const keys = ['apple', 'banana', 'orange'];
      const values = [100, '200' as unknown as number, 300];

      expect(() => {
        builder.build(keys, values);
      }).toThrow(BuildError);
      expect(() => {
        builder.build(keys, values);
      }).toThrow('All values must be numbers');
    });

    it('should call progress callback when provided', () => {
      jest.useFakeTimers();

      const builder = new Builder();
      const keys = ['apple', 'banana', 'orange'];

      // Mock progress callback
      const progressCallback = jest.fn();

      const dict = builder.build(keys, undefined, { progressCallback });

      // Fast-forward timers
      jest.advanceTimersByTime(1000);

      // Ensure callback was called at least once
      expect(progressCallback).toHaveBeenCalled();

      // Clean up
      dict.dispose();

      jest.useRealTimers();
    });
  });

  describe('buildAndSave', () => {
    it('should build and save a dictionary asynchronously', async () => {
      const builder = new Builder();
      const keys = ['apple', 'banana', 'orange'];

      const result = await builder.buildAndSave(keys, dictPath);
      expect(result).toBe(true);
      expect(fs.existsSync(dictPath)).toBe(true);
    });

    it('should reject with error when build fails', async () => {
      const builder = new Builder();
      const keys: string[] = []; // Empty keys array will cause an error

      await expect(builder.buildAndSave(keys, dictPath)).rejects.toThrow(BuildError);
      await expect(builder.buildAndSave(keys, dictPath)).rejects.toThrow('Empty keys array');
    });
  });

  describe('buildAndSaveSync', () => {
    it('should build and save a dictionary synchronously', () => {
      const builder = new Builder();
      const keys = ['apple', 'banana', 'orange'];

      const result = builder.buildAndSaveSync(keys, dictPath);
      expect(result).toBe(true);
      expect(fs.existsSync(dictPath)).toBe(true);
    });
  });
});

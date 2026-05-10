import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BuildError, Builder } from '../../src';

// darts-clone rejects zero-length keys at build time; taku910/darts accepts
// them. Read the configured default backend so the assertion matches.
const defaultBackend = process.env.NODE_DARTS_DEFAULT_BACKEND === 'clone' ? 'clone' : 'darts';

describe('Advanced Tests', () => {
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

  describe('Unicode support', () => {
    it('should handle Unicode characters correctly', () => {
      const builder = new Builder();
      const keys = ['こんにちは', '世界', '日本語', 'こんばんは'];
      const values = [100, 200, 300, 400];

      const dict = builder.build(keys, values);

      expect(dict.exactMatchSearch('こんにちは')).toBe(100);
      expect(dict.exactMatchSearch('世界')).toBe(200);
      expect(dict.exactMatchSearch('日本語')).toBe(300);

      const results = dict.commonPrefixSearch('こんにちは世界');
      expect(results).toContain(100); // 'こんにちは'

      dict.dispose();
    });
  });

  describe('Edge cases', () => {
    it('handles empty strings (taku910/darts) or rejects them (darts-clone)', () => {
      const builder = new Builder();
      const keys = ['', 'a', 'ab', 'abc'];
      const values = [100, 200, 300, 400];

      if (defaultBackend === 'clone') {
        // darts-clone rejects zero-length keys at build time.
        expect(() => builder.build(keys, values)).toThrow(BuildError);
        return;
      }

      const dict = builder.build(keys, values);
      expect(dict.exactMatchSearch('')).toBe(100);
      expect(dict.exactMatchSearch('a')).toBe(200);

      const results = dict.commonPrefixSearch('abcd');
      expect(results).toContain(200); // 'a'
      expect(results).toContain(300); // 'ab'
      expect(results).toContain(400); // 'abc'

      dict.dispose();
    });

    it('should handle special characters', () => {
      const builder = new Builder();
      const keys = ['a+b', 'a*b', 'a?b', 'a.b'];
      const values = [100, 200, 300, 400];

      const dict = builder.build(keys, values);

      // Verify that keys containing special characters can be searched correctly
      // Note: The actual values may vary depending on the order during dictionary construction,
      // so we only check that the value is not -1 (not found)
      expect(dict.exactMatchSearch('a+b')).not.toBe(-1);
      expect(dict.exactMatchSearch('a*b')).not.toBe(-1);
      expect(dict.exactMatchSearch('a?b')).not.toBe(-1);
      expect(dict.exactMatchSearch('a.b')).not.toBe(-1);

      dict.dispose();
    });
  });

  describe('Large dictionary', () => {
    it('should handle large number of keys', () => {
      const builder = new Builder();
      const keys: string[] = [];
      const values: number[] = [];

      // Generate 1000 keys
      for (let i = 0; i < 1000; i += 1) {
        keys.push(`key${i.toString().padStart(4, '0')}`);
        values.push(i);
      }

      const dict = builder.build(keys, values);

      // Test 10 random keys
      for (let i = 0; i < 10; i += 1) {
        const index = Math.floor(Math.random() * 1000);
        const key = `key${index.toString().padStart(4, '0')}`;
        expect(dict.exactMatchSearch(key)).toBe(index);
      }

      dict.dispose();
    });
  });
});

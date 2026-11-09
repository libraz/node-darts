import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Dictionary } from '../../src';

describe('Integration Tests', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-darts-integration-'));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('build, save and load', () => {
    const entries: [string, number][] = [
      ['apple', 100],
      ['banana', 200],
      ['orange', 300],
      ['pineapple', 400],
      ['strawberry', 500],
    ];

    it('round-trips a dictionary through a file', () => {
      const file = path.join(tempDir, 'integration.darts');
      Dictionary.build(entries).saveSync(file);

      using dict = Dictionary.loadSync(file);
      for (const [key, value] of entries) {
        expect(dict.exactMatchSearch(key)).toBe(value);
      }
      expect(dict.exactMatchSearch('grape')).toBeUndefined();
      expect(dict.commonPrefixSearch('pineapple')).toEqual([{ value: 400, length: 9 }]);
    });

    it('assigns input-order indices to a key-only build and keeps them after save', async () => {
      const file = path.join(tempDir, 'indices.darts');
      await Dictionary.build(['apple', 'banana', 'orange']).save(file);
      expect(fs.existsSync(file)).toBe(true);

      using dict = await Dictionary.load(file);
      expect(['apple', 'banana', 'orange'].map((k) => dict.exactMatchSearch(k))).toEqual([0, 1, 2]);
    });

    it('rebuilds an identical image from toBytes', () => {
      using a = Dictionary.build(entries);
      using b = Dictionary.fromBytes(a.toBytes());
      expect(b.toBytes()).toEqual(a.toBytes());
      expect(b.byteLength).toBe(a.byteLength);
    });
  });

  describe('memory management', () => {
    it('creates and disposes many instances', () => {
      const dicts = Array.from({ length: 10 }, (_v, i) => Dictionary.build([`key${i}`]));
      for (const dict of dicts) dict.dispose();
      using fresh = Dictionary.build(['fresh']);
      expect(fresh.disposed).toBe(false);
      expect(fresh.exactMatchSearch('fresh')).toBe(0);
    });
  });

  describe('traverse', () => {
    it('walks a key and reports where it is stored', () => {
      using dict = Dictionary.build([
        ['apple', 100],
        ['application', 101],
        ['banana', 200],
        ['orange', 300],
        ['pineapple', 400],
      ]);
      const steps = dict.traverse('apple');
      expect(steps).toHaveLength('apple'.length);
      expect(steps.at(-1)).toEqual({ length: 5, value: 100 });

      const toward = dict.traverse('application');
      expect(toward).toHaveLength('application'.length);
      expect(toward.at(-1)).toEqual({ length: 11, value: 101 });
      expect(toward[4]).toEqual({ length: 5, value: undefined });
    });
  });
});

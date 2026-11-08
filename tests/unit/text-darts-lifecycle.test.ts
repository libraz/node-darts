/**
 * TextDarts / loadDictionary lifecycle: size tracks the dictionary currently
 * held, a disposed object raises the library's DartsError, and a failed load
 * releases the native handle it allocated.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildAndSaveDictionarySync,
  createDictionary,
  DartsError,
  InvalidDictionaryError,
  loadDictionary,
  TextDarts,
} from '../../src';

describe('TextDarts lifecycle', () => {
  let tempDir: string;
  let bigDict: string;
  let badFile: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-darts-lifecycle-'));
    bigDict = path.join(tempDir, 'big.darts');
    badFile = path.join(tempDir, 'bad.darts');
    buildAndSaveDictionarySync(['one', 'two', 'three', 'four', 'five'], bigDict);
    fs.writeFileSync(badFile, 'not a dictionary');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('size counts duplicated words once', () => {
    const darts = TextDarts.build(['a', 'a', 'b']);
    expect(darts.size()).toBe(2);
    darts.dispose();
  });

  it('size reflects a dictionary swapped in by loadSync', () => {
    const darts = TextDarts.build(['a', 'b']);
    const loaded = TextDarts.load(bigDict);
    const expected = loaded.size();
    loaded.dispose();

    darts.loadSync(bigDict);
    expect(darts.size()).toBe(expected);
    darts.dispose();
  });

  it('size reflects a dictionary swapped in by load', async () => {
    const darts = TextDarts.build(['a', 'b']);
    const loaded = TextDarts.load(bigDict);
    const expected = loaded.size();
    loaded.dispose();

    await darts.load(bigDict);
    expect(darts.size()).toBe(expected);
    darts.dispose();
  });

  it('a disposed TextDarts raises DartsError like Dictionary does', () => {
    const darts = TextDarts.build(['a']);
    darts.dispose();
    expect(() => darts.exactMatchSearch('a')).toThrow(DartsError);
    expect(() => darts.size()).toThrow(DartsError);
  });

  it('loadDictionary releases its handle when the load fails', () => {
    const probe = createDictionary();
    const freed = probe.getHandle();
    probe.dispose();

    expect(() => loadDictionary(badFile, { backend: 'clone' })).toThrow(InvalidDictionaryError);

    const next = createDictionary();
    expect(next.getHandle()).toBe(freed);
    next.dispose();
  });

  it('TextDarts.load releases its handle when the load fails', () => {
    const probe = createDictionary();
    const freed = probe.getHandle();
    probe.dispose();

    expect(() => TextDarts.load(badFile, { backend: 'clone' })).toThrow(InvalidDictionaryError);

    const next = createDictionary();
    expect(next.getHandle()).toBe(freed);
    next.dispose();
  });
});

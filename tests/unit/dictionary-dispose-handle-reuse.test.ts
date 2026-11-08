/**
 * Dictionary dispose semantics and native handle reuse: every public method
 * of a disposed Dictionary throws DartsError, dispose is idempotent, and a
 * recycled handle never exposes the previous dictionary's keys.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Backend } from '../../src';
import { buildDictionary, createDictionary, DartsError, type Dictionary } from '../../src';

const BACKENDS: Backend[] = ['darts', 'clone'];

describe.each(BACKENDS)('disposed Dictionary (%s)', (backend) => {
  let tempDir: string;
  let file: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-darts-dispose-'));
    file = path.join(tempDir, 'd.darts');
    const d = buildDictionary(['a'], undefined, { backend });
    fs.writeFileSync(file, '');
    d.dispose();
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const disposed = () => {
    const dict = buildDictionary(['a', 'ab'], [1, 2], { backend });
    dict.dispose();
    return dict;
  };

  it('reports disposed = true', () => {
    expect(disposed().disposed).toBe(true);
  });

  it.each([
    ['exactMatchSearch', (d: Dictionary) => d.exactMatchSearch('a')],
    ['commonPrefixSearch', (d: Dictionary) => d.commonPrefixSearch('ab')],
    ['traverse', (d: Dictionary) => d.traverse('a', () => true)],
    ['loadSync', (d: Dictionary) => d.loadSync(file)],
    ['getBackend', (d: Dictionary) => d.getBackend()],
    ['size', (d: Dictionary) => d.size()],
    ['replaceWords', (d: Dictionary) => d.replaceWords('a', () => 'x')],
    ['getHandle', (d: Dictionary) => d.getHandle()],
  ])('%s throws DartsError', (_name, call) => {
    expect(() => call(disposed())).toThrow(DartsError);
    expect(() => call(disposed())).toThrow(/disposed/);
  });

  it('load rejects with DartsError', async () => {
    await expect(disposed().load(file)).rejects.toThrow(DartsError);
  });

  it('does not call the traverse callback', () => {
    let called = false;
    expect(() =>
      disposed().traverse('a', () => {
        called = true;
        return true;
      })
    ).toThrow(DartsError);
    expect(called).toBe(false);
  });

  it('dispose twice is a no-op', () => {
    const dict = buildDictionary(['a'], undefined, { backend });
    dict.dispose();
    expect(() => dict.dispose()).not.toThrow();
    expect(dict.disposed).toBe(true);
  });

  it('a second dispose does not release a handle that was recycled in between', () => {
    const first = buildDictionary(['old'], [1], { backend });
    first.dispose();
    const second = buildDictionary(['new'], [2], { backend });
    first.dispose();
    expect(second.exactMatchSearch('new')).toBe(2);
    second.dispose();
  });

  it('a disposed empty dictionary also throws', () => {
    const dict = createDictionary(backend);
    dict.dispose();
    expect(() => dict.size()).toThrow(DartsError);
  });
});

describe.each(BACKENDS)('handle reuse (%s)', (backend) => {
  it('does not leak keys from a disposed dictionary into the next one', () => {
    const a = buildDictionary(['alpha', 'alpine', 'あ'], [1, 2, 3], { backend });
    a.dispose();
    const b = buildDictionary(['beta', 'bet'], [10, 20], { backend });

    expect(b.exactMatchSearch('beta')).toBe(10);
    expect(b.exactMatchSearch('alpha')).toBe(-1);
    expect(b.exactMatchSearch('あ')).toBe(-1);
    expect(b.commonPrefixSearch('alpine')).toEqual([]);
    expect(b.commonPrefixSearch('betas')).toEqual([20, 10]);
    b.dispose();
  });

  it('a recycled empty dictionary has no keys from its predecessor', () => {
    const a = buildDictionary(['alpha'], [1], { backend });
    a.dispose();
    const fresh = createDictionary(backend);
    expect(fresh.exactMatchSearch('alpha')).toBe(-1);
    expect(fresh.size()).toBe(0);
    expect(fresh.getBackend()).toBe(backend);
    fresh.dispose();
  });

  it('keeps live dictionaries independent while others are created and disposed', () => {
    const live = buildDictionary(['keep'], [7], { backend });
    for (let i = 0; i < 50; i += 1) {
      const tmp = buildDictionary([`k${i}`], [i], { backend });
      expect(tmp.exactMatchSearch(`k${i}`)).toBe(i);
      expect(tmp.exactMatchSearch('keep')).toBe(-1);
      tmp.dispose();
    }
    expect(live.exactMatchSearch('keep')).toBe(7);
    expect(live.exactMatchSearch('k0')).toBe(-1);
    live.dispose();
  });

  it('switches backend cleanly when a handle is recycled across backends', () => {
    const other: Backend = backend === 'darts' ? 'clone' : 'darts';
    const a = buildDictionary(['x'], [1], { backend: other });
    a.dispose();
    const b = buildDictionary(['y'], [2], { backend });
    expect(b.getBackend()).toBe(backend);
    expect(b.exactMatchSearch('y')).toBe(2);
    expect(b.exactMatchSearch('x')).toBe(-1);
    b.dispose();
  });

  it('keeps every dictionary correct when many are alive at once', () => {
    const dicts = Array.from({ length: 40 }, (_v, i) =>
      buildDictionary([`key${i}`], [i], { backend })
    );
    dicts.forEach((d, i) => {
      expect(d.exactMatchSearch(`key${i}`)).toBe(i);
      expect(d.exactMatchSearch(`key${(i + 1) % 40}`)).toBe(-1);
    });
    for (const d of dicts) d.dispose();
  });
});

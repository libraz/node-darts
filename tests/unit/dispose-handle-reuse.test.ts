/**
 * The core's handle table is module-global and reuses freed slots, so a
 * recycled handle must never expose a previous dictionary's keys and a
 * repeated dispose must not release a handle that has since been reused.
 */

import { describe, expect, it } from 'vitest';
import { type Backend, Dictionary } from '../../src';

const BACKENDS: Backend[] = ['darts', 'clone'];

describe.each(BACKENDS)('handle reuse (%s)', (backend) => {
  it('does not leak keys from a disposed dictionary into the next one', () => {
    const a = Dictionary.build(['alpha', 'alpine', 'あ'], { backend });
    a.dispose();
    using b = Dictionary.build(
      [
        ['beta', 10],
        ['bet', 20],
      ],
      { backend }
    );

    expect(b.exactMatchSearch('beta')).toBe(10);
    expect(b.exactMatchSearch('alpha')).toBeUndefined();
    expect(b.exactMatchSearch('あ')).toBeUndefined();
    expect(b.commonPrefixSearch('alpine')).toEqual([]);
    expect(b.commonPrefixSearch('betas').map((m) => m.value)).toEqual([20, 10]);
  });

  it('a second dispose does not release a handle that was recycled in between', () => {
    const first = Dictionary.build([['old', 1]], { backend });
    first.dispose();
    using second = Dictionary.build([['new', 2]], { backend });
    first.dispose();
    expect(second.exactMatchSearch('new')).toBe(2);
  });

  it('keeps live dictionaries independent while others come and go', () => {
    using live = Dictionary.build([['keep', 7]], { backend });
    for (let i = 0; i < 50; i += 1) {
      using tmp = Dictionary.build([[`k${i}`, i]], { backend });
      expect(tmp.exactMatchSearch(`k${i}`)).toBe(i);
      expect(tmp.exactMatchSearch('keep')).toBeUndefined();
    }
    expect(live.exactMatchSearch('keep')).toBe(7);
    expect(live.exactMatchSearch('k0')).toBeUndefined();
  });

  it('switches backend cleanly when a handle is recycled across backends', () => {
    const other: Backend = backend === 'darts' ? 'clone' : 'darts';
    Dictionary.build([['x', 1]], { backend: other }).dispose();
    using b = Dictionary.build([['y', 2]], { backend });
    expect(b.backend).toBe(backend);
    expect(b.exactMatchSearch('y')).toBe(2);
    expect(b.exactMatchSearch('x')).toBeUndefined();
  });

  it('keeps every dictionary correct when many are alive at once', () => {
    const dicts = Array.from({ length: 40 }, (_v, i) =>
      Dictionary.build([[`key${i}`, i]], { backend })
    );
    dicts.forEach((d, i) => {
      expect(d.exactMatchSearch(`key${i}`)).toBe(i);
      expect(d.exactMatchSearch(`key${(i + 1) % 40}`)).toBeUndefined();
    });
    for (const d of dicts) d.dispose();
  });

  it('serves loaded and fromBytes dictionaries from distinct handles', () => {
    using a = Dictionary.build([['one', 1]], { backend });
    using b = Dictionary.fromBytes(Dictionary.build([['two', 2]], { backend }).toBytes(), {
      backend,
    });
    expect(a.exactMatchSearch('two')).toBeUndefined();
    expect(b.exactMatchSearch('one')).toBeUndefined();
    expect(b.exactMatchSearch('two')).toBe(2);
  });
});

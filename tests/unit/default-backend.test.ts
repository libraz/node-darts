import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dictionary } from '../../src';
import { getDefaultBackend, setDefaultBackend } from '../../src/internal/defaults';

const initial = getDefaultBackend();
const legacyEnv = process.env.NODE_DARTS_DEFAULT_BACKEND;
afterEach(() => {
  setDefaultBackend(initial);
  if (legacyEnv === undefined) delete process.env.NODE_DARTS_DEFAULT_BACKEND;
  else process.env.NODE_DARTS_DEFAULT_BACKEND = legacyEnv;
});

describe('default build backend', () => {
  it("starts as 'darts' and ignores the environment", async () => {
    process.env.NODE_DARTS_DEFAULT_BACKEND = 'clone';
    vi.resetModules();
    const fresh = await import('../../src/internal/defaults');
    expect(fresh.getDefaultBackend()).toBe('darts');
  });

  it('is what build uses without a backend option', () => {
    for (const backend of ['darts', 'clone'] as const) {
      setDefaultBackend(backend);
      const dict = Dictionary.build(['a']);
      expect(dict.backend).toBe(backend);
      dict.dispose();
    }
  });

  it('does not affect load auto-detection', () => {
    const bytes = Dictionary.build(['a'], { backend: 'clone' }).toBytes();
    setDefaultBackend('darts');
    const dict = Dictionary.fromBytes(bytes);
    expect(dict.backend).toBe('clone');
    dict.dispose();
  });

  it('rejects an unknown backend', () => {
    expect(() => setDefaultBackend('other' as 'darts')).toThrow(TypeError);
    expect(getDefaultBackend()).toBe(initial);
  });
});

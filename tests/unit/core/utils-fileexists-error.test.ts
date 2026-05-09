/**
 * Vitest test for the catch branch in src/core/utils.ts::fileExists.
 *
 * existsSync is documented as non-throwing, but the wrapper still has a
 * defensive try/catch. Mock the fs module so existsSync throws and verify the
 * catch returns false instead of propagating.
 */

import type * as FS from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', async () => {
  const original = await vi.importActual<typeof FS>('node:fs');
  return {
    ...original,
    default: original,
    existsSync: vi.fn(),
  };
});

describe('utils.fileExists — error path', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when fs.existsSync throws', async () => {
    const fs = await import('node:fs');
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('simulated EACCES');
    });

    const { fileExists } = await import('../../../src/core/utils');
    expect(fileExists('/anything')).toBe(false);
  });
});

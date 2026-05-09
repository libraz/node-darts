/**
 * Vitest tests for the fallback mechanism in src/core/native.ts.
 * Mocks 'bindings' (so the standard load throws) and 'fs' (so the candidate
 * paths in the fallback loop look like they exist), then exercises the
 * different branches of the fallback.
 */

import type * as FS from 'node:fs';
import type { Mock } from 'vitest';

vi.resetModules();

vi.mock('bindings', () => ({
  default: vi.fn().mockImplementation(() => {
    throw new Error('Mocked bindings error');
  }),
}));

vi.mock('node:fs', async () => {
  const originalFs = await vi.importActual<typeof FS>('node:fs');
  return {
    ...originalFs,
    default: originalFs,
    existsSync: vi.fn().mockImplementation((filePath: unknown) => {
      if (typeof filePath === 'string' && filePath.includes('node_darts.node')) {
        return true;
      }
      return originalFs.existsSync(filePath as string);
    }),
  };
});

vi.mock('fs', async () => {
  const originalFs = await vi.importActual<typeof FS>('node:fs');
  return {
    ...originalFs,
    default: originalFs,
    existsSync: vi.fn().mockImplementation((filePath: unknown) => {
      if (typeof filePath === 'string' && filePath.includes('node_darts.node')) {
        return true;
      }
      return originalFs.existsSync(filePath as string);
    }),
  };
});

const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalProcessPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const originalProcessEnv = process.env;

describe('Native Module Fallback Mechanism', () => {
  beforeEach(() => {
    console.warn = vi.fn();
    console.error = vi.fn();
    vi.resetModules();
    Object.defineProperty(process, 'platform', { value: 'win32' });
    process.env = { ...process.env, CI: 'true' };
    vi.clearAllMocks();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    if (originalProcessPlatform) {
      Object.defineProperty(process, 'platform', originalProcessPlatform);
    }
    process.env = originalProcessEnv;
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should use fallback mechanism when bindings fails on Windows CI', async () => {
    const { dartsNative } = await import('../../../src/core/native');
    expect(console.warn).toHaveBeenCalled();
    expect(dartsNative).toBeDefined();
    expect(typeof dartsNative.createDictionary).toBe('function');
  });

  it('should throw error when no module is found in fallback paths', async () => {
    const fs = await import('node:fs');
    (fs.existsSync as unknown as Mock).mockReturnValue(false);

    await expect(import('../../../src/core/native')).rejects.toThrow();
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('should throw original error when not on Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    await expect(import('../../../src/core/native')).rejects.toThrow('Mocked bindings error');
  });

  it('should throw original error when not in CI environment', async () => {
    process.env = {};
    await expect(import('../../../src/core/native')).rejects.toThrow('Mocked bindings error');
  });

  it('should handle require errors in fallback mechanism', async () => {
    // Make existsSync return true ONLY for the legacy Windows-specific
    // candidate so the real candidates (which would actually resolve on the
    // host filesystem) are skipped. require() of the lying path then throws,
    // exercising the catch-loop in the fallback.
    const fs = await import('node:fs');
    (fs.existsSync as unknown as Mock).mockImplementation(
      (filePath: unknown) =>
        typeof filePath === 'string' && filePath.includes('node-v115-win32-x64')
    );

    await expect(import('../../../src/core/native')).rejects.toThrow();
    expect(console.warn).toHaveBeenCalled();
  });
});

/**
 * This test file is for testing the fallback mechanism in src/core/native.ts
 * It uses mocks to simulate various scenarios to improve test coverage
 */

// Disable ESLint rules for this test file since we need to use dynamic requires and mocks
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */

// Clear the module cache to ensure our mocks work
jest.resetModules();

// Mock modules
jest.mock('bindings', () => {
  return jest.fn().mockImplementation(() => {
    throw new Error('Mocked bindings error');
  });
});

jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn().mockImplementation((filePath) => {
      // Return true for ANY path that might contain node_darts.node
      if (typeof filePath === 'string' && filePath.includes('node_darts.node')) {
        return true;
      }
      return originalFs.existsSync(filePath);
    }),
  };
});

// We need to use these modules in our test
// eslint-disable-next-line @typescript-eslint/no-unused-vars
require('fs');
require('bindings');

// Create a mock for the native module
const mockNativeModule = {
  createDictionary: jest.fn().mockReturnValue(1),
  destroyDictionary: jest.fn(),
  loadDictionary: jest.fn().mockReturnValue(true),
  saveDictionary: jest.fn().mockReturnValue(true),
  exactMatchSearch: jest.fn().mockReturnValue(0),
  commonPrefixSearch: jest.fn().mockReturnValue([]),
  traverse: jest.fn(),
  build: jest.fn().mockReturnValue(1),
  size: jest.fn().mockReturnValue(0),
};

// Create a mock for require
const mockRequire = jest.fn((id: string) => {
  if (id.includes('node_darts.node')) {
    return mockNativeModule;
  }
  // For other modules, use the original require
  return jest.requireActual(id);
});

// Save original values
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalProcessPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const originalProcessEnv = process.env;

describe('Native Module Fallback Mechanism', () => {
  beforeEach(() => {
    // Mock console methods to avoid cluttering test output
    console.warn = jest.fn();
    console.error = jest.fn();

    // Reset modules before each test
    jest.resetModules();

    // Mock process.platform to simulate Windows
    Object.defineProperty(process, 'platform', { value: 'win32' });

    // Mock process.env to simulate CI environment
    process.env = { ...process.env, CI: 'true' };

    // Reset the mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original functions
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;

    if (originalProcessPlatform) {
      Object.defineProperty(process, 'platform', originalProcessPlatform);
    }

    process.env = originalProcessEnv;

    // Restore mocks
    jest.restoreAllMocks();

    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should use fallback mechanism when bindings fails on Windows CI', () => {
    // Import the module after setting up mocks
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { dartsNative } = require('../src/core/native');

    // Verify that the module was loaded using fallback
    expect(console.warn).toHaveBeenCalled();

    // Verify that the module works
    expect(dartsNative).toBeDefined();
    expect(typeof dartsNative.createDictionary).toBe('function');
  });

  it('should throw error when no module is found in fallback paths', () => {
    // Mock fs.existsSync to simulate not finding the module
    jest.mock('fs', () => ({
      ...jest.requireActual('fs'),
      existsSync: jest.fn().mockReturnValue(false),
    }));

    // Import should throw an error
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../src/core/native');
    }).toThrow();

    // Verify that the fallback mechanism was attempted
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('should throw original error when not on Windows', () => {
    // Mock process.platform to simulate non-Windows
    Object.defineProperty(process, 'platform', { value: 'linux' });

    // Import should throw the original error
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../src/core/native');
    }).toThrow('Mocked bindings error');
  });

  it('should throw original error when not in CI environment', () => {
    // Mock process.env to simulate non-CI environment
    process.env = {};

    // Import should throw the original error
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../src/core/native');
    }).toThrow('Mocked bindings error');
  });

  it('should handle require errors in fallback mechanism', () => {
    // Mock require to simulate error when loading the module
    mockRequire.mockImplementation((id: string) => {
      if (id.includes('node_darts.node')) {
        throw new Error('Mocked require error');
      }
      // For other modules, use the original require
      return jest.requireActual(id);
    });

    // Import should throw an error
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../src/core/native');
    }).toThrow();

    // Verify that the fallback mechanism was attempted
    expect(console.warn).toHaveBeenCalled();
  });
});

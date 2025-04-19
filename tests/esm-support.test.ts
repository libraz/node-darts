// Import from core/native directly to test the wrapper
import { DartsNativeWrapper } from '../src/core/native';

// We don't need to mock the module for basic tests
// The actual implementation will be tested in integration tests

describe('ESM/CJS Support', () => {
  // Skip actual wrapper tests as they are covered in native.test.ts
  // Just verify that the exports are available
  it('should have the DartsNativeWrapper class', () => {
    expect(DartsNativeWrapper).toBeDefined();
    expect(typeof DartsNativeWrapper).toBe('function');
  });
});

// Test for package.json exports configuration
describe('Package Exports Configuration', () => {
  it('should have correct exports configuration in package.json', () => {
    // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
    const packageJson = require('../package.json');

    // Check exports field
    expect(packageJson).toHaveProperty('exports');

    // Check that exports has the correct structure
    const { exports } = packageJson;
    // Using Object.keys to check if the key exists
    expect(Object.keys(exports)).toContain('.');
    // Then check the properties
    expect(exports['.']).toHaveProperty('require', './dist/cjs/index.js');
    expect(exports['.']).toHaveProperty('import', './dist/esm/index.js');
    expect(exports['.']).toHaveProperty('types', './dist/index.d.ts');
  });
});

// Test for dual package support
describe('Dual Package Support', () => {
  it('should export the same interface in both CJS and ESM', () => {
    // Import both CJS and ESM versions
    // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
    const cjsExports = require('../src/index');
    // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
    const esmExports = require('../src/index.esm');

    // Check that both export the same functions
    expect(Object.keys(cjsExports)).toEqual(
      expect.arrayContaining([
        'Dictionary',
        'Builder',
        'TextDarts',
        'createDictionary',
        'createBuilder',
        'loadDictionary',
        'buildDictionary',
        'buildAndSaveDictionary',
        'buildAndSaveDictionarySync',
      ])
    );

    expect(Object.keys(esmExports)).toEqual(
      expect.arrayContaining([
        'Dictionary',
        'Builder',
        'TextDarts',
        'createDictionary',
        'createBuilder',
        'loadDictionary',
        'buildDictionary',
        'buildAndSaveDictionary',
        'buildAndSaveDictionarySync',
      ])
    );
  });
});

// Test for prebuild support
describe('Prebuild Support', () => {
  it('should have node-pre-gyp in dependencies', () => {
    // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
    const packageJson = require('../package.json');
    expect(packageJson.dependencies).toHaveProperty('@mapbox/node-pre-gyp');
  });

  it('should have binary configuration in package.json', () => {
    // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
    const packageJson = require('../package.json');
    expect(packageJson).toHaveProperty('binary');
    expect(packageJson.binary).toHaveProperty('module_name');
    expect(packageJson.binary).toHaveProperty('module_path');
    expect(packageJson.binary).toHaveProperty('host');
  });

  it('should have install script using node-pre-gyp', () => {
    // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
    const packageJson = require('../package.json');
    expect(packageJson.scripts).toHaveProperty('install');
    expect(packageJson.scripts.install).toContain('node-pre-gyp');
    expect(packageJson.scripts.install).toContain('--fallback-to-build');
  });
});

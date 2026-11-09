import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));

describe('package.json', () => {
  it('lists types first in every exports condition, with per-format declarations', () => {
    const root = pkg.exports['.'];
    expect(Object.keys(root)).toEqual(['import', 'require']);
    expect(root.import).toEqual({
      types: './dist/esm/index.d.ts',
      default: './dist/esm/index.js',
    });
    expect(root.require).toEqual({
      types: './dist/cjs/index.d.ts',
      default: './dist/cjs/index.js',
    });
    expect(Object.keys(root.import)[0]).toBe('types');
    expect(Object.keys(root.require)[0]).toBe('types');
    expect(pkg.exports['./package.json']).toBe('./package.json');
  });

  it('points main and types at the CommonJS build and has no module field', () => {
    expect(pkg.main).toBe('./dist/cjs/index.js');
    expect(pkg.types).toBe('./dist/cjs/index.d.ts');
    expect(pkg).not.toHaveProperty('module');
  });

  it('constrains only the Node version', () => {
    expect(pkg.engines).toEqual({ node: '>=20.4.0' });
  });

  it('publishes dist, the license files and the Japanese README', () => {
    expect(pkg.files).toEqual(['dist', 'LICENSE', 'NOTICE', 'README_ja.md']);
  });
});

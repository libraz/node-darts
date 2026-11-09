import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

// Runs against the built package in dist/; `yarn build` must have run first.
const root = path.join(__dirname, '../..');

const EXPECTED = [
  'BuildError',
  'DartsError',
  'Dictionary',
  'FileNotFoundError',
  'InvalidDictionaryError',
];

function keys(args: string[]): string[] {
  const out = execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  return JSON.parse(out);
}

describe('runtime exports of the built package', () => {
  it('dist exists', () => {
    expect(fs.existsSync(path.join(root, 'dist/cjs/index.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'dist/esm/index.js'))).toBe(true);
  });

  it('CommonJS entry exports exactly the public values', () => {
    const names = keys([
      '-e',
      "console.log(JSON.stringify(Object.keys(require('./dist/cjs/index.js')).sort()))",
    ]);
    expect(names).toEqual(EXPECTED);
  });

  it('ES module entry exports exactly the public values', () => {
    const names = keys([
      '--input-type=module',
      '-e',
      "const m = await import('./dist/esm/index.js'); console.log(JSON.stringify(Object.keys(m).sort()))",
    ]);
    expect(names).toEqual(EXPECTED);
  });
});

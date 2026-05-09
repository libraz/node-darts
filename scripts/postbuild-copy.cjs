/**
 * Post-build script.
 * - Copies ESM type definitions to dist/index.d.ts for the unified types entry.
 * - Writes per-format package.json marker files so Node's ESM resolver treats
 *   dist/esm/*.js as ESM and dist/cjs/*.js as CommonJS regardless of the root
 *   package's "type" field.
 */

// eslint-disable-next-line
const fs = require('node:fs');
// eslint-disable-next-line
const path = require('node:path');

const distDir = path.join(__dirname, '..', 'dist');
const esmDtsPath = path.join(distDir, 'esm', 'index.d.ts');
const rootDtsPath = path.join(distDir, 'index.d.ts');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

try {
  const content = fs.readFileSync(esmDtsPath, 'utf8');
  fs.writeFileSync(rootDtsPath, content);
  console.log('✅ Copied type definitions to dist/index.d.ts');
} catch (error) {
  console.error('❌ Error copying type definitions:', error);
  process.exit(1);
}

const markers = [
  { dir: path.join(distDir, 'cjs'), type: 'commonjs' },
  { dir: path.join(distDir, 'esm'), type: 'module' },
];

for (const { dir, type } of markers) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Expected build output directory missing: ${dir}`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify({ type }, null, 2)}\n`);
  console.log(`✅ Wrote ${path.relative(distDir, dir)}/package.json (type: ${type})`);
}

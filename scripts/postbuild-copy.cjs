/**
 * Post-build script to copy type definitions
 * This script copies the ESM type definitions to the root dist directory
 * for unified type reference
 */

// eslint-disable-next-line
const fs = require('fs');
// eslint-disable-next-line
const path = require('path');

// Paths
const esmDtsPath = path.join(__dirname, '../dist/esm/index.d.ts');
const rootDtsPath = path.join(__dirname, '../dist/index.d.ts');

// Ensure dist directory exists
if (!fs.existsSync(path.dirname(rootDtsPath))) {
  fs.mkdirSync(path.dirname(rootDtsPath), { recursive: true });
}

// Copy the ESM d.ts file to the root dist directory
try {
  const content = fs.readFileSync(esmDtsPath, 'utf8');
  fs.writeFileSync(rootDtsPath, content);
  console.log('✅ Successfully copied type definitions to dist/index.d.ts');
} catch (error) {
  console.error('❌ Error copying type definitions:', error);
  process.exit(1);
}

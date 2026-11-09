import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/** Creates a fresh temporary directory removed by the returned cleanup. */
export function makeTempDir(): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-darts-api-'));
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

/**
 * Hand-assembles a Darts 0.32 image from `(index, base, check)` units; every
 * other unit is zero.
 */
export function dartsImage(units: ReadonlyArray<readonly [number, number, number]>): Uint8Array {
  const size = Math.max(...units.map(([i]) => i)) + 1;
  const bytes = new Uint8Array(size * 8);
  const view = new DataView(bytes.buffer);
  for (const [i, base, check] of units) {
    view.setInt32(i * 8, base, true);
    view.setUint32(i * 8 + 4, check, true);
  }
  return bytes;
}

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Dictionary } from 'node-darts';

const dir = mkdtempSync(join(tmpdir(), 'node-darts-'));
try {
  // [key, value] pairs, a Map, or plain keys (the value is then the input index).
  const dict = Dictionary.build(
    new Map([
      ['apple', 100],
      ['banana', 200],
      ['cherry', 300],
    ]),
    { backend: 'clone' }
  );

  const file = join(dir, 'fruits.darts');
  await dict.save(file);
  dict.dispose();

  // The format is detected on load.
  const loaded = await Dictionary.load(file);
  console.log(loaded.backend); // 'clone'
  console.log(loaded.exactMatchSearch('cherry')); // 300

  // The raw image can also travel as bytes (database column, bundled asset).
  const copy = Dictionary.fromBytes(loaded.toBytes());
  console.log(copy.exactMatchSearch('apple')); // 100
  loaded.dispose();
  copy.dispose();
} finally {
  rmSync(dir, { recursive: true, force: true });
}

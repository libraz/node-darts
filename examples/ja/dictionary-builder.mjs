import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Dictionary } from 'node-darts';

const dir = mkdtempSync(join(tmpdir(), 'node-darts-'));
try {
  // [キー, 値] の組、Map、またはキーだけの配列（値は入力順インデックス）を渡せます。
  const dict = Dictionary.build(
    new Map([
      ['りんご', 100],
      ['バナナ', 200],
      ['さくらんぼ', 300],
    ]),
    { backend: 'clone' }
  );

  const file = join(dir, 'fruits.darts');
  await dict.save(file);
  dict.dispose();

  // 形式は読み込み時に自動判別されます。
  const loaded = await Dictionary.load(file);
  console.log(loaded.backend); // 'clone'
  console.log(loaded.exactMatchSearch('さくらんぼ')); // 300

  // 辞書の実体はバイト列としても受け渡せます（DB の列やバンドルした資産など）。
  const copy = Dictionary.fromBytes(loaded.toBytes());
  console.log(copy.exactMatchSearch('りんご')); // 100
  loaded.dispose();
  copy.dispose();
} finally {
  rmSync(dir, { recursive: true, force: true });
}

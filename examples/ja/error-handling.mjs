import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DartsError, Dictionary, FileNotFoundError, InvalidDictionaryError } from 'node-darts';

// 引数の誤りは TypeError / RangeError です。
try {
  Dictionary.build([]);
} catch (err) {
  console.log(err instanceof RangeError, err.message);
}
try {
  Dictionary.build([['りんご', -1]]);
} catch (err) {
  console.log(err instanceof RangeError, err.message);
}

// ファイルがなければ FileNotFoundError です。
try {
  await Dictionary.load(join(tmpdir(), 'node-darts-missing.darts'));
} catch (err) {
  console.log(err instanceof FileNotFoundError, err.code, err.path);
}

// 辞書として読めないバイト列は InvalidDictionaryError です。
try {
  Dictionary.fromBytes(new Uint8Array(3));
} catch (err) {
  console.log(err instanceof InvalidDictionaryError, err.code);
}

// dispose 済みの辞書を使うと DartsError です。CJS と ESM の両方を読み込む場合は、
// クラスではなく code で判定します。
const dict = Dictionary.build(['りんご']);
dict.dispose();
try {
  dict.exactMatchSearch('りんご');
} catch (err) {
  console.log(err instanceof DartsError, err.code);
}

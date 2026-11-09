import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DartsError, Dictionary, FileNotFoundError, InvalidDictionaryError } from 'node-darts';

// Bad arguments are TypeError / RangeError.
try {
  Dictionary.build([]);
} catch (err) {
  console.log(err instanceof RangeError, err.message);
}
try {
  Dictionary.build([['apple', -1]]);
} catch (err) {
  console.log(err instanceof RangeError, err.message);
}

// A missing file is a FileNotFoundError.
try {
  await Dictionary.load(join(tmpdir(), 'node-darts-missing.darts'));
} catch (err) {
  console.log(err instanceof FileNotFoundError, err.code, err.path);
}

// Bytes that are not a dictionary are an InvalidDictionaryError.
try {
  Dictionary.fromBytes(new Uint8Array(3));
} catch (err) {
  console.log(err instanceof InvalidDictionaryError, err.code);
}

// Using a disposed dictionary is a DartsError. Check `code` rather than the
// class when CJS and ESM copies of the package may both be loaded.
const dict = Dictionary.build(['apple']);
dict.dispose();
try {
  dict.exactMatchSearch('apple');
} catch (err) {
  console.log(err instanceof DartsError, err.code);
}

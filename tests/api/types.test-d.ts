import { describe, expectTypeOf, it } from 'vitest';
import * as api from '../../src';
import {
  type Backend,
  BuildError,
  type BuildInput,
  type BuildOptions,
  DartsError,
  type DartsErrorCode,
  Dictionary,
  FileNotFoundError,
  InvalidDictionaryError,
  type LoadOptions,
  type PrefixMatch,
  type TraverseStep,
  type WordReplacer,
} from '../../src';

declare const dict: Dictionary;

describe('public types', () => {
  it('exports every public type', () => {
    expectTypeOf<Backend>().toEqualTypeOf<'darts' | 'clone'>();
    expectTypeOf<DartsErrorCode>().toEqualTypeOf<
      | 'ERR_DARTS_FILE_NOT_FOUND'
      | 'ERR_DARTS_INVALID_DICTIONARY'
      | 'ERR_DARTS_BUILD_FAILED'
      | 'ERR_DARTS_DISPOSED'
      | 'ERR_DARTS_IO'
    >();
    expectTypeOf<BuildInput>().toEqualTypeOf<
      Iterable<string> | Iterable<readonly [string, number]>
    >();
    expectTypeOf<BuildOptions>().toEqualTypeOf<{ readonly backend?: Backend }>();
    expectTypeOf<LoadOptions>().toEqualTypeOf<{ readonly backend?: Backend }>();
    expectTypeOf<PrefixMatch>().toEqualTypeOf<{
      readonly value: number;
      readonly length: number;
    }>();
    expectTypeOf<TraverseStep>().toEqualTypeOf<{
      readonly length: number;
      readonly value: number | undefined;
    }>();
    expectTypeOf<WordReplacer>().toEqualTypeOf<
      | ((match: string, value: number) => string)
      | ReadonlyMap<string, string>
      | Readonly<Record<string, string>>
    >();
  });

  it('exports the error classes with typed codes', () => {
    expectTypeOf<DartsError['code']>().toEqualTypeOf<DartsErrorCode>();
    expectTypeOf<FileNotFoundError['path']>().toEqualTypeOf<string>();
    expectTypeOf<FileNotFoundError>().toMatchTypeOf<DartsError>();
    expectTypeOf<InvalidDictionaryError>().toMatchTypeOf<DartsError>();
    expectTypeOf<BuildError>().toMatchTypeOf<DartsError>();
    expectTypeOf(DartsError).toBeConstructibleWith('m', { code: 'ERR_DARTS_IO' });
    expectTypeOf(DartsError).toBeConstructibleWith('m', { code: 'ERR_DARTS_IO', cause: 1 });
    expectTypeOf(FileNotFoundError).toBeConstructibleWith('/p');
    expectTypeOf(InvalidDictionaryError).toBeConstructibleWith('m', { cause: 1 });
    expectTypeOf(BuildError).toBeConstructibleWith('m');
    // @ts-expect-error code is required
    new DartsError('m', {});
    // @ts-expect-error unknown code
    new DartsError('m', { code: 'ERR_OTHER' });
  });

  it('does not export the removed names', () => {
    // @ts-expect-error removed
    api.Builder;
    // @ts-expect-error removed
    api.createBuilder;
    // @ts-expect-error removed
    api.createDictionary;
    // @ts-expect-error removed
    api.loadDictionary;
    // @ts-expect-error removed
    api.buildDictionary;
    // @ts-expect-error removed
    api.buildAndSaveDictionary;
    // @ts-expect-error removed
    api.buildAndSaveDictionarySync;
    // @ts-expect-error removed
    api.TextDarts;
    // @ts-expect-error removed
    api.DartsNativeWrapper;
    // @ts-expect-error removed
    api.dartsNative;
    // @ts-expect-error removed
    api.fileExists;
    // @ts-expect-error removed
    api.validateFilePath;
    // @ts-expect-error removed
    api.ensureDirectoryExists;
    // @ts-expect-error removed
    api.sortStrings;
    // @ts-expect-error removed
    api.uniqueArray;
    // @ts-expect-error removed
    api.sortAndUniqueStrings;
    // @ts-expect-error removed
    type _TraverseCallback = api.TraverseCallback;
    // @ts-expect-error removed
    type _TraverseResult = api.TraverseResult;
    // @ts-expect-error removed
    type _DartsNative = api.DartsNative;
  });
});

describe('Dictionary', () => {
  it('is created only through static factories', () => {
    // @ts-expect-error private constructor
    new Dictionary();
    expectTypeOf(Dictionary.build).returns.toEqualTypeOf<Dictionary>();
    expectTypeOf(Dictionary.load).returns.toEqualTypeOf<Promise<Dictionary>>();
    expectTypeOf(Dictionary.loadSync).returns.toEqualTypeOf<Dictionary>();
    expectTypeOf(Dictionary.fromBytes).returns.toEqualTypeOf<Dictionary>();
  });

  it('build takes readonly strings, readonly tuples and Maps', () => {
    const keys: readonly string[] = ['a'];
    const tuples: ReadonlyArray<readonly [string, number]> = [['a', 1]];
    Dictionary.build(keys);
    Dictionary.build(tuples);
    Dictionary.build(new Map([['a', 1]]));
    Dictionary.build(new Set(['a']));
    Dictionary.build(['a'], { backend: 'clone' });
    // @ts-expect-error values must be numbers
    Dictionary.build([['a', '1']]);
    // @ts-expect-error unknown backend
    Dictionary.build(['a'], { backend: 'other' });
    // @ts-expect-error excess option
    Dictionary.build(['a'], { progressCallback: () => undefined });
  });

  it('takes string or URL paths and Uint8Array bytes', () => {
    Dictionary.loadSync('x.darts');
    Dictionary.loadSync(new URL('file:///x.darts'), { backend: 'darts' });
    Dictionary.fromBytes(new Uint8Array(8));
    Dictionary.fromBytes(Buffer.alloc(8));
    expectTypeOf(dict.save).parameter(0).toEqualTypeOf<string | URL>();
    expectTypeOf(dict.save).returns.toEqualTypeOf<Promise<void>>();
    expectTypeOf(dict.saveSync).returns.toEqualTypeOf<void>();
    expectTypeOf(dict.toBytes).returns.toEqualTypeOf<Uint8Array>();
    // @ts-expect-error not a path
    Dictionary.loadSync(1);
  });

  it('searches return Map-like misses and match objects', () => {
    expectTypeOf(dict.exactMatchSearch).toEqualTypeOf<(key: string) => number | undefined>();
    expectTypeOf(dict.commonPrefixSearch).toEqualTypeOf<(text: string) => PrefixMatch[]>();
    expectTypeOf(dict.traverse).toEqualTypeOf<(text: string) => TraverseStep[]>();
    expectTypeOf(dict.replaceWords).returns.toEqualTypeOf<string>();
    dict.replaceWords('t', (match, value) => `${match}${value}`);
    dict.replaceWords('t', new Map([['a', 'b']]));
    dict.replaceWords('t', { a: 'b' });
    // @ts-expect-error replacement must be a string
    dict.replaceWords('t', () => 1);
  });

  it('has read-only getters and a dispose protocol', () => {
    expectTypeOf(dict.backend).toEqualTypeOf<Backend>();
    expectTypeOf(dict.byteLength).toEqualTypeOf<number>();
    expectTypeOf(dict.disposed).toEqualTypeOf<boolean>();
    expectTypeOf(dict.dispose).toEqualTypeOf<() => void>();
    expectTypeOf(dict[Symbol.dispose]).toEqualTypeOf<() => void>();
    // @ts-expect-error read-only
    dict.backend = 'clone';
    // @ts-expect-error read-only
    dict.byteLength = 1;
    // @ts-expect-error read-only
    dict.disposed = true;
    // @ts-expect-error removed
    dict.size();
    // @ts-expect-error removed
    dict.getBackend();
    // @ts-expect-error removed
    dict.getHandle();
  });
});

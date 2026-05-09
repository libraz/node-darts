/**
 * Vitest tests for the JS-side wrappers in src/core/native.ts.
 *
 * The bindings() module is mocked once with a Proxy that defers every property
 * read to a per-test stub. native.ts is then imported a single time so the
 * DartsError identity (and the wrapper itself) stay stable across tests; each
 * it() just swaps the stub's behaviour to drive a specific catch/rethrow path.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BuildError,
  DartsError,
  FileNotFoundError,
  InvalidDictionaryError,
} from '../../../src/core/errors';
import { dartsNative } from '../../../src/core/native';
import type { DartsNative } from '../../../src/core/types';

type Stub = Partial<Record<keyof DartsNative, ReturnType<typeof vi.fn>>>;

let currentStub: Stub = {};

vi.mock('bindings', () => ({
  default: vi.fn().mockImplementation(
    () =>
      new Proxy(
        {},
        {
          get: (_target, prop: string) => (currentStub as Record<string, unknown>)[prop],
        }
      )
  ),
}));

describe('DartsNativeWrapper error/rethrow paths', () => {
  beforeEach(() => {
    currentStub = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createDictionary', () => {
    it('throws DartsError when the native side returns null', () => {
      currentStub = { createDictionary: vi.fn().mockReturnValue(null) };
      expect(() => dartsNative.createDictionary()).toThrow(DartsError);
      expect(() => dartsNative.createDictionary()).toThrow('Failed to create dictionary');
    });

    it('throws DartsError when the native side returns undefined', () => {
      currentStub = { createDictionary: vi.fn().mockReturnValue(undefined) };
      expect(() => dartsNative.createDictionary()).toThrow(DartsError);
    });

    it('rethrows DartsError unchanged when the native call throws one', () => {
      const original = new DartsError('boom');
      currentStub = {
        createDictionary: vi.fn().mockImplementation(() => {
          throw original;
        }),
      };

      try {
        dartsNative.createDictionary();
      } catch (err) {
        expect(err).toBe(original);
        return;
      }
      throw new Error('expected createDictionary to throw');
    });

    it('wraps non-Error throws into DartsError', () => {
      currentStub = {
        createDictionary: vi.fn().mockImplementation(() => {
          // eslint-disable-next-line no-throw-literal
          throw 'string failure';
        }),
      };
      expect(() => dartsNative.createDictionary()).toThrow(DartsError);
      expect(() => dartsNative.createDictionary()).toThrow(/string failure/);
    });
  });

  describe('destroyDictionary', () => {
    it('wraps native throws into DartsError', () => {
      currentStub = {
        destroyDictionary: vi.fn().mockImplementation(() => {
          throw new Error('native blew up');
        }),
      };
      expect(() => dartsNative.destroyDictionary(1)).toThrow(DartsError);
      expect(() => dartsNative.destroyDictionary(1)).toThrow(/native blew up/);
    });
  });

  describe('loadDictionary', () => {
    it('throws InvalidDictionaryError when native returns false', () => {
      currentStub = { loadDictionary: vi.fn().mockReturnValue(false) };
      // Use this test file as the path so the existsSync precondition passes.
      expect(() => dartsNative.loadDictionary(1, __filename)).toThrow(InvalidDictionaryError);
    });

    it('rethrows DartsError unchanged when native throws one', () => {
      const original = new InvalidDictionaryError('already wrapped');
      currentStub = {
        loadDictionary: vi.fn().mockImplementation(() => {
          throw original;
        }),
      };

      try {
        dartsNative.loadDictionary(1, __filename);
      } catch (err) {
        expect(err).toBe(original);
        return;
      }
      throw new Error('expected loadDictionary to throw');
    });

    it('translates "not found" errors into FileNotFoundError', () => {
      currentStub = {
        loadDictionary: vi.fn().mockImplementation(() => {
          throw new Error('underlying says: file not found');
        }),
      };
      expect(() => dartsNative.loadDictionary(1, __filename)).toThrow(FileNotFoundError);
    });

    it('translates "No such file" errors into FileNotFoundError', () => {
      currentStub = {
        loadDictionary: vi.fn().mockImplementation(() => {
          throw new Error('No such file or directory');
        }),
      };
      expect(() => dartsNative.loadDictionary(1, __filename)).toThrow(FileNotFoundError);
    });

    it('wraps generic native errors into InvalidDictionaryError', () => {
      currentStub = {
        loadDictionary: vi.fn().mockImplementation(() => {
          throw new Error('checksum mismatch');
        }),
      };
      expect(() => dartsNative.loadDictionary(1, __filename)).toThrow(InvalidDictionaryError);
      expect(() => dartsNative.loadDictionary(1, __filename)).toThrow(/checksum mismatch/);
    });

    it('wraps non-Error throws into InvalidDictionaryError', () => {
      currentStub = {
        loadDictionary: vi.fn().mockImplementation(() => {
          // eslint-disable-next-line no-throw-literal
          throw 42;
        }),
      };
      expect(() => dartsNative.loadDictionary(1, __filename)).toThrow(InvalidDictionaryError);
    });
  });

  describe('saveDictionary', () => {
    it('throws DartsError when native returns false', () => {
      currentStub = { saveDictionary: vi.fn().mockReturnValue(false) };
      expect(() => dartsNative.saveDictionary(1, '/tmp/whatever.darts')).toThrow(DartsError);
      expect(() => dartsNative.saveDictionary(1, '/tmp/whatever.darts')).toThrow(
        /Failed to save dictionary/
      );
    });

    it('rethrows DartsError unchanged', () => {
      const original = new DartsError('passthrough');
      currentStub = {
        saveDictionary: vi.fn().mockImplementation(() => {
          throw original;
        }),
      };

      try {
        dartsNative.saveDictionary(1, '/tmp/whatever.darts');
      } catch (err) {
        expect(err).toBe(original);
        return;
      }
      throw new Error('expected saveDictionary to throw');
    });

    it('wraps native throws into DartsError', () => {
      currentStub = {
        saveDictionary: vi.fn().mockImplementation(() => {
          throw new Error('disk full');
        }),
      };
      expect(() => dartsNative.saveDictionary(1, '/tmp/whatever.darts')).toThrow(DartsError);
      expect(() => dartsNative.saveDictionary(1, '/tmp/whatever.darts')).toThrow(/disk full/);
    });
  });

  describe('exactMatchSearch', () => {
    it('wraps native throws into DartsError', () => {
      currentStub = {
        exactMatchSearch: vi.fn().mockImplementation(() => {
          throw new Error('bad handle');
        }),
      };
      expect(() => dartsNative.exactMatchSearch(1, 'foo')).toThrow(DartsError);
    });
  });

  describe('commonPrefixSearch', () => {
    it('wraps native throws into DartsError', () => {
      currentStub = {
        commonPrefixSearch: vi.fn().mockImplementation(() => {
          throw new Error('bad handle');
        }),
      };
      expect(() => dartsNative.commonPrefixSearch(1, 'foo')).toThrow(DartsError);
    });
  });

  describe('traverse', () => {
    it('wraps native throws into DartsError', () => {
      currentStub = {
        traverse: vi.fn().mockImplementation(() => {
          throw new Error('bad handle');
        }),
      };
      expect(() => dartsNative.traverse(1, 'foo', () => true)).toThrow(DartsError);
    });
  });

  describe('build', () => {
    it('throws BuildError when native returns null', () => {
      currentStub = { build: vi.fn().mockReturnValue(null) };
      expect(() => dartsNative.build(['a'])).toThrow(BuildError);
      expect(() => dartsNative.build(['a'])).toThrow(/Failed to build dictionary/);
    });

    it('throws BuildError when native returns undefined', () => {
      currentStub = { build: vi.fn().mockReturnValue(undefined) };
      expect(() => dartsNative.build(['a'])).toThrow(BuildError);
    });

    it('rethrows BuildError unchanged when native throws one', () => {
      const original = new BuildError('passthrough');
      currentStub = {
        build: vi.fn().mockImplementation(() => {
          throw original;
        }),
      };

      try {
        dartsNative.build(['a']);
      } catch (err) {
        expect(err).toBe(original);
        return;
      }
      throw new Error('expected build to throw');
    });

    it('wraps non-DartsError throws from native into BuildError', () => {
      currentStub = {
        build: vi.fn().mockImplementation(() => {
          throw new Error('native build crashed');
        }),
      };
      expect(() => dartsNative.build(['a'])).toThrow(BuildError);
      expect(() => dartsNative.build(['a'])).toThrow(/native build crashed/);
    });

    it('wraps non-Error throws into BuildError', () => {
      currentStub = {
        build: vi.fn().mockImplementation(() => {
          // eslint-disable-next-line no-throw-literal
          throw 'native panic';
        }),
      };
      expect(() => dartsNative.build(['a'])).toThrow(BuildError);
      expect(() => dartsNative.build(['a'])).toThrow(/native panic/);
    });
  });

  describe('size', () => {
    it('wraps native throws into DartsError', () => {
      currentStub = {
        size: vi.fn().mockImplementation(() => {
          throw new Error('bad handle');
        }),
      };
      expect(() => dartsNative.size(1)).toThrow(DartsError);
    });
  });
});

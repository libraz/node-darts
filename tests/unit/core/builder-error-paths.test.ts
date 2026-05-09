/**
 * Vitest tests for the catch/rethrow paths in Builder.build (src/core/builder.ts).
 *
 * The validateInput / sort guards are already covered by other suites; here we
 * only need to exercise what happens when the native call itself throws.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import Builder from '../../../src/core/builder';
import { BuildError, DartsError } from '../../../src/core/errors';
import { dartsNative } from '../../../src/core/native';

describe('Builder.build — native throw handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rethrows a BuildError from the native layer unchanged', () => {
    const original = new BuildError('native validation failed');
    vi.spyOn(dartsNative, 'build').mockImplementation(() => {
      throw original;
    });

    const builder = new Builder();
    try {
      builder.build(['a', 'b']);
    } catch (err) {
      expect(err).toBe(original);
      return;
    }
    throw new Error('expected Builder.build to throw');
  });

  it('rethrows a non-BuildError DartsError unchanged via BuildError wrapping', () => {
    // DartsError is a parent of BuildError but not itself a BuildError, so the
    // `instanceof BuildError` check must fail and the wrapper path is taken.
    vi.spyOn(dartsNative, 'build').mockImplementation(() => {
      throw new DartsError('lower-level darts error');
    });

    const builder = new Builder();
    expect(() => builder.build(['a', 'b'])).toThrow(BuildError);
    expect(() => builder.build(['a', 'b'])).toThrow(/lower-level darts error/);
  });

  it('wraps generic Error throws into BuildError using the original message', () => {
    vi.spyOn(dartsNative, 'build').mockImplementation(() => {
      throw new Error('memory exhausted');
    });

    const builder = new Builder();
    expect(() => builder.build(['a', 'b'])).toThrow(BuildError);
    expect(() => builder.build(['a', 'b'])).toThrow(/memory exhausted/);
  });

  it('wraps non-Error throws into BuildError stringifying the value', () => {
    vi.spyOn(dartsNative, 'build').mockImplementation(() => {
      // eslint-disable-next-line no-throw-literal
      throw 'native panic';
    });

    const builder = new Builder();
    expect(() => builder.build(['a', 'b'])).toThrow(BuildError);
    expect(() => builder.build(['a', 'b'])).toThrow(/native panic/);
  });
});

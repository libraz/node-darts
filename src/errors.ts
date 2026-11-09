import type { DartsErrorCode } from './types.js';

/**
 * Base class of the errors this package raises for failed operations. Check
 * `code` rather than `instanceof` when CommonJS and ES module copies of the
 * package may meet in one process.
 *
 * Invalid arguments raise the built-in `TypeError` or `RangeError` instead.
 */
export class DartsError extends Error {
  /** Machine-readable failure kind. */
  readonly code: DartsErrorCode;

  constructor(message: string, options: { code: DartsErrorCode; cause?: unknown }) {
    super(message, 'cause' in options ? { cause: options.cause } : undefined);
    this.name = 'DartsError';
    this.code = options.code;
  }
}

/** A dictionary file to load does not exist (`ERR_DARTS_FILE_NOT_FOUND`). */
export class FileNotFoundError extends DartsError {
  /** The path that was not found; a file URL is given as its path. */
  readonly path: string;

  constructor(path: string, options?: { cause?: unknown }) {
    super(`dictionary file not found: ${path}`, { ...options, code: 'ERR_DARTS_FILE_NOT_FOUND' });
    this.name = 'FileNotFoundError';
    this.path = path;
  }
}

/** Bytes are not a dictionary image of the requested or any layout (`ERR_DARTS_INVALID_DICTIONARY`). */
export class InvalidDictionaryError extends DartsError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { ...options, code: 'ERR_DARTS_INVALID_DICTIONARY' });
    this.name = 'InvalidDictionaryError';
  }
}

/** The builder rejected the keys, for example an empty key in darts-clone (`ERR_DARTS_BUILD_FAILED`). */
export class BuildError extends DartsError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { ...options, code: 'ERR_DARTS_BUILD_FAILED' });
    this.name = 'BuildError';
  }
}

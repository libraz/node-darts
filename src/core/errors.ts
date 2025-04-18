/**
 * Base error class for Darts library
 */
export class DartsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DartsError';
    // Correctly set the prototype chain for Error object
    Object.setPrototypeOf(this, DartsError.prototype);
  }
}

/**
 * Error class for when a file is not found
 */
export class FileNotFoundError extends DartsError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`);
    this.name = 'FileNotFoundError';
    Object.setPrototypeOf(this, FileNotFoundError.prototype);
  }
}

/**
 * Error class for when a dictionary file is invalid
 */
export class InvalidDictionaryError extends DartsError {
  constructor(message: string) {
    super(`Invalid dictionary: ${message}`);
    this.name = 'InvalidDictionaryError';
    Object.setPrototypeOf(this, InvalidDictionaryError.prototype);
  }
}

/**
 * Error class for dictionary build errors
 */
export class BuildError extends DartsError {
  constructor(message: string) {
    super(`Build error: ${message}`);
    this.name = 'BuildError';
    Object.setPrototypeOf(this, BuildError.prototype);
  }
}
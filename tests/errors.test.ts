import {
  DartsError,
  FileNotFoundError,
  InvalidDictionaryError,
  BuildError,
} from '../src/core/errors';

describe('Error classes', () => {
  describe('DartsError', () => {
    it('should create a DartsError with the correct name and message', () => {
      const error = new DartsError('Test error message');
      expect(error.name).toBe('DartsError');
      expect(error.message).toBe('Test error message');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof DartsError).toBe(true);
    });
  });

  describe('FileNotFoundError', () => {
    it('should create a FileNotFoundError with the correct name and message', () => {
      const error = new FileNotFoundError('/path/to/file.txt');
      expect(error.name).toBe('FileNotFoundError');
      expect(error.message).toBe('File not found: /path/to/file.txt');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof DartsError).toBe(true);
      expect(error instanceof FileNotFoundError).toBe(true);
    });
  });

  describe('InvalidDictionaryError', () => {
    it('should create an InvalidDictionaryError with the correct name and message', () => {
      const error = new InvalidDictionaryError('Corrupt file');
      expect(error.name).toBe('InvalidDictionaryError');
      expect(error.message).toBe('Invalid dictionary: Corrupt file');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof DartsError).toBe(true);
      expect(error instanceof InvalidDictionaryError).toBe(true);
    });
  });

  describe('BuildError', () => {
    it('should create a BuildError with the correct name and message', () => {
      const error = new BuildError('Invalid keys');
      expect(error.name).toBe('BuildError');
      expect(error.message).toBe('Build error: Invalid keys');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof DartsError).toBe(true);
      expect(error instanceof BuildError).toBe(true);
    });
  });
});

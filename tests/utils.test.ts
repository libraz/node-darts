import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { 
  fileExists, 
  validateFilePath, 
  ensureDirectoryExists, 
  sortStrings, 
  uniqueArray, 
  sortAndUniqueStrings 
} from '../src/core/utils';
import { FileNotFoundError } from '../src/core/errors';

describe('Utils', () => {
  let tempDir: string;
  let testFilePath: string;
  let nonExistentFilePath: string;

  beforeAll(() => {
    // Create a temporary directory for testing
    tempDir = path.join(os.tmpdir(), `node-darts-utils-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Create a test file
    testFilePath = path.join(tempDir, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'test content');
    
    // Path to a non-existent file
    nonExistentFilePath = path.join(tempDir, 'non-existent-file.txt');
  });
  
  afterAll(() => {
    // Remove the temporary test directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('fileExists', () => {
    it('should return true for existing files', () => {
      expect(fileExists(testFilePath)).toBe(true);
    });
    
    it('should return false for non-existent files', () => {
      expect(fileExists(nonExistentFilePath)).toBe(false);
    });
    
    it('should return false for invalid paths', () => {
      expect(fileExists('')).toBe(false);
      expect(fileExists(null as unknown as string)).toBe(false);
      expect(fileExists(undefined as unknown as string)).toBe(false);
    });
  });

  describe('validateFilePath', () => {
    it('should not throw for existing files', () => {
      expect(() => validateFilePath(testFilePath)).not.toThrow();
    });
    
    it('should throw FileNotFoundError for non-existent files', () => {
      expect(() => validateFilePath(nonExistentFilePath)).toThrow(FileNotFoundError);
      expect(() => validateFilePath(nonExistentFilePath)).toThrow(`File not found: ${nonExistentFilePath}`);
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', () => {
      const newDirPath = path.join(tempDir, 'new-dir', 'sub-dir');
      const testFilePath = path.join(newDirPath, 'test.txt');
      
      // Directory should not exist yet
      expect(fs.existsSync(newDirPath)).toBe(false);
      
      // Ensure directory exists
      ensureDirectoryExists(testFilePath);
      
      // Directory should now exist
      expect(fs.existsSync(path.dirname(testFilePath))).toBe(true);
    });
    
    it('should not throw if directory already exists', () => {
      expect(() => ensureDirectoryExists(testFilePath)).not.toThrow();
    });
  });

  describe('sortStrings', () => {
    it('should sort an array of strings', () => {
      const unsorted = ['banana', 'apple', 'orange', 'grape'];
      const sorted = sortStrings(unsorted);
      
      expect(sorted).toEqual(['apple', 'banana', 'grape', 'orange']);
      // Original array should not be modified
      expect(unsorted).toEqual(['banana', 'apple', 'orange', 'grape']);
    });
    
    it('should handle empty arrays', () => {
      expect(sortStrings([])).toEqual([]);
    });
    
    it('should handle arrays with one element', () => {
      expect(sortStrings(['apple'])).toEqual(['apple']);
    });
  });

  describe('uniqueArray', () => {
    it('should remove duplicates from an array', () => {
      const withDuplicates = [1, 2, 2, 3, 4, 4, 5];
      const unique = uniqueArray(withDuplicates);
      
      expect(unique).toEqual([1, 2, 3, 4, 5]);
      // Original array should not be modified
      expect(withDuplicates).toEqual([1, 2, 2, 3, 4, 4, 5]);
    });
    
    it('should handle arrays with no duplicates', () => {
      expect(uniqueArray([1, 2, 3])).toEqual([1, 2, 3]);
    });
    
    it('should handle empty arrays', () => {
      expect(uniqueArray([])).toEqual([]);
    });
    
    it('should handle arrays with one element', () => {
      expect(uniqueArray([1])).toEqual([1]);
    });
    
    it('should work with string arrays', () => {
      expect(uniqueArray(['a', 'b', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });
  });

  describe('sortAndUniqueStrings', () => {
    it('should sort and remove duplicates from an array of strings', () => {
      const array = ['banana', 'apple', 'orange', 'apple', 'grape', 'banana'];
      const result = sortAndUniqueStrings(array);
      
      expect(result).toEqual(['apple', 'banana', 'grape', 'orange']);
      // Original array should not be modified
      expect(array).toEqual(['banana', 'apple', 'orange', 'apple', 'grape', 'banana']);
    });
    
    it('should handle empty arrays', () => {
      expect(sortAndUniqueStrings([])).toEqual([]);
    });
    
    it('should handle arrays with one element', () => {
      expect(sortAndUniqueStrings(['apple'])).toEqual(['apple']);
    });
  });
});
import { TextDarts, FileNotFoundError } from '../src';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('TextDarts', () => {
  let tempDir: string;
  let dictPath: string;
  
  beforeAll(() => {
    // Create a temporary directory for testing
    tempDir = path.join(os.tmpdir(), `node-darts-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Path to the test dictionary file
    dictPath = path.join(tempDir, 'test.darts');
  });
  
  afterAll(() => {
    // Remove the temporary test directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  describe('new', () => {
    it('should create a new TextDarts instance from word list', () => {
      const words = ['apple', 'banana', 'orange'];
      const td = TextDarts.new(words);
      expect(td).toBeInstanceOf(TextDarts);
      td.dispose();
    });
    
    it('should throw error when creating from non-existent file', () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.darts');
      
      expect(() => {
        TextDarts.new(nonExistentPath);
      }).toThrow(FileNotFoundError);
    });
  });
  
  describe('build', () => {
    it('should build a dictionary from word list', () => {
      const words = ['apple', 'banana', 'orange'];
      const td = TextDarts.build(words);
      expect(td).toBeInstanceOf(TextDarts);
      
      // Test exact match search
      expect(td.exactMatchSearch('apple')).toBe(0);
      expect(td.exactMatchSearch('banana')).toBe(1);
      expect(td.exactMatchSearch('orange')).toBe(2);
      expect(td.exactMatchSearch('grape')).toBe(-1);
      
      td.dispose();
    });
    
    it('should build a dictionary with custom values', () => {
      const words = ['apple', 'banana', 'orange'];
      const values = [100, 200, 300];
      const td = TextDarts.build(words, values);
      
      expect(td.exactMatchSearch('apple')).toBe(100);
      expect(td.exactMatchSearch('banana')).toBe(200);
      expect(td.exactMatchSearch('orange')).toBe(300);
      
      td.dispose();
    });
  });
  
  describe('buildAndSaveSync', () => {
    it('should build and save a dictionary', () => {
      const words = ['apple', 'banana', 'orange'];
      const result = TextDarts.buildAndSaveSync(words, dictPath);
      expect(result).toBe(true);
      expect(fs.existsSync(dictPath)).toBe(true);
    });
  });
  
  describe('load', () => {
    it('should load a dictionary from file', () => {
      const td = TextDarts.load(dictPath);
      expect(td).toBeInstanceOf(TextDarts);
      
      // Test exact match search
      expect(td.exactMatchSearch('apple')).toBe(0);
      expect(td.exactMatchSearch('banana')).toBe(1);
      expect(td.exactMatchSearch('orange')).toBe(2);
      
      td.dispose();
    });
  });
  
  describe('replaceWords', () => {
    let td: TextDarts;
    const words = ['apple', 'banana', 'orange', 'pineapple'];
    
    beforeEach(() => {
      td = TextDarts.build(words);
    });
    
    afterEach(() => {
      td.dispose();
    });
    
    it('should replace words using callback function', () => {
      const text = 'I like apple and pineapple';
      const result = td.replaceWords(text, (match) => `<<${match}>>`);
      expect(result).toBe('I like <<apple>> and <<pineapple>>');
    });
    
    it('should replace words using replacement map', () => {
      const text = 'I like apple and banana';
      const replacementMap: Record<string, string> = {
        'apple': 'APPLE',
        'banana': 'BANANA'
      };
      const result = td.replaceWords(text, replacementMap);
      expect(result).toBe('I like APPLE and BANANA');
    });
    
    it('should handle overlapping words correctly', () => {
      // Create a dictionary with overlapping words
      const overlapTd = TextDarts.build(['app', 'apple', 'pineapple']);
      const text = 'app apple pineapple';
      const result = overlapTd.replaceWords(text, (match) => `[${match}]`);
      // Should match the longest word at each position
      expect(result).toBe('[app] [apple] [pineapple]');
      overlapTd.dispose();
    });
    
    it('should not replace anything if no matches found', () => {
      const text = 'I like grapes';
      const result = td.replaceWords(text, (match) => `<<${match}>>`);
      expect(result).toBe('I like grapes');
    });
  });
  
  describe('commonPrefixSearch', () => {
    it('should find all common prefixes', () => {
      const td = TextDarts.build(['a', 'ab', 'abc', 'abcd']);
      
      const result1 = td.commonPrefixSearch('a');
      expect(result1).toEqual([0]);
      
      const result2 = td.commonPrefixSearch('ab');
      expect(result2).toEqual([0, 1]);
      
      const result3 = td.commonPrefixSearch('abc');
      expect(result3).toEqual([0, 1, 2]);
      
      const result4 = td.commonPrefixSearch('abcd');
      expect(result4).toEqual([0, 1, 2, 3]);
      
      const result5 = td.commonPrefixSearch('abcde');
      expect(result5).toEqual([0, 1, 2, 3]);
      
      td.dispose();
    });
  });
  
  describe('traverse', () => {
    it('should traverse the trie', () => {
      const td = TextDarts.build(['a', 'ab', 'abc']);
      const results: any[] = [];
      
      td.traverse('abc', (result) => {
        results.push({ ...result });
        return true;
      });
      
      expect(results.length).toBeGreaterThan(0);
      td.dispose();
    });
  });
  
  describe('size', () => {
    it('should return the size of the dictionary', () => {
      const words = ['apple', 'banana', 'orange'];
      const td = TextDarts.build(words);
      
      expect(td.size()).toBe(3);
      td.dispose();
    });
  });
  
  describe('dispose', () => {
    it('should dispose the dictionary', () => {
      const td = TextDarts.build(['apple']);
      td.dispose();
      
      // Method calls after dispose should throw an error
      expect(() => {
        td.size();
      }).toThrow();
    });
  });
});
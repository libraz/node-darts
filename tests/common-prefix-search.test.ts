import { Dictionary, Builder, buildDictionary } from '../src';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Common Prefix Search Tests', () => {
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

  describe('commonPrefixSearch', () => {
    it('should understand how commonPrefixSearch works', () => {
      // Create a dictionary with specific keys and values
      const keys = ['a', 'ap', 'app', 'apple', 'application', 'b', 'ba', 'ban', 'banana'];
      const values = [1, 2, 3, 100, 200, 4, 5, 6, 300];
      
      const dict = buildDictionary(keys, values);
      
      // Test common prefix search for different search strings
      // Note: commonPrefixSearch returns values for all keys that are prefixes of the search string
      const resultsApple = dict.commonPrefixSearch('apple');
      const resultsAppli = dict.commonPrefixSearch('application');
      const resultsBanana = dict.commonPrefixSearch('banana');
      
      // We expect resultsApple to contain values for 'a', 'ap', 'app', 'apple'
      expect(resultsApple).toContain(1); // 'a'
      expect(resultsApple).toContain(2); // 'ap'
      expect(resultsApple).toContain(3); // 'app'
      expect(resultsApple).toContain(100); // 'apple'
      
      // We expect resultsBanana to contain values for 'b', 'ba', 'ban', 'banana'
      expect(resultsBanana).toContain(4); // 'b'
      expect(resultsBanana).toContain(5); // 'ba'
      expect(resultsBanana).toContain(6); // 'ban'
      expect(resultsBanana).toContain(300); // 'banana'
      
      dict.dispose();
    });
    
    it('should handle the case when values are not provided', () => {
      // Create a dictionary with only keys
      const keys = ['a', 'ap', 'app', 'apple', 'application', 'b', 'ba', 'ban', 'banana'];
      
      const dict = buildDictionary(keys);
      
      // Test common prefix search
      const resultsApple = dict.commonPrefixSearch('apple');
      
      // Check if results contain the expected indices
      expect(resultsApple).toContain(0); // 'a'
      expect(resultsApple).toContain(1); // 'ap'
      expect(resultsApple).toContain(2); // 'app'
      expect(resultsApple).toContain(3); // 'apple'
      
      dict.dispose();
    });
    
    it('should demonstrate how to fix dictionary-builder.js', () => {
      // Create a dictionary with specific keys and values
      const keys = ['apple', 'application', 'banana', 'orange'];
      const values = [100, 200, 300, 400];
      
      const dict = buildDictionary(keys, values);
      
      // This is how dictionary-builder.js should be fixed:
      const results = dict.commonPrefixSearch('apple');
      
      // The problem is that we're looking for values in the results
      // But the results are already the values, not indices
      for (const result of results) {
        // Find the key corresponding to this value
        const keyIndex = values.indexOf(result);
        if (keyIndex !== -1) {
          // In the actual implementation, we would log this
          // console.log(`  - ${keys[keyIndex]} (${result})`);
          // For testing, we'll just verify the result exists
          expect(keys[keyIndex]).toBe('apple');
          expect(result).toBe(100);
        }
      }
      
      // For the case when values are not provided (indices are used)
      const dict2 = buildDictionary(['a', 'ap', 'app', 'apple']);
      const results2 = dict2.commonPrefixSearch('apple');
      
      // In this case, results are indices, so we can directly use them
      expect(results2).toContain(0); // 'a'
      expect(results2).toContain(1); // 'ap'
      expect(results2).toContain(2); // 'app'
      expect(results2).toContain(3); // 'apple'
      
      dict.dispose();
      dict2.dispose();
    });
  });
});
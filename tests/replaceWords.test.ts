/**
 * Test for replaceWords functionality
 *
 * This file tests the text replacement functionality (replaceWords).
 */

import { buildDictionary, TextDarts } from '../src';

describe('replaceWords', () => {
  // テストで使用する変数
  const words = ['apple', 'banana', 'orange', 'pineapple'];
  const values = [100, 200, 300, 400];
  const text = 'I like apple and pineapple for breakfast.';
  const expected = 'I like <<apple>> and <<pineapple>> for breakfast.';
  
  describe('Dictionary', () => {
    let dict1: any, dict2: any;
    
    beforeEach(() => {
      // 各テスト前に辞書を構築
      dict1 = buildDictionary(words);
      dict2 = buildDictionary(words, values);
    });
    
    afterEach(() => {
      // 各テスト後にリソースを解放
      dict1.dispose();
      dict2.dispose();
    });
    
    it('should replace words correctly when dictionary is built with words only', () => {
      const result = dict1.replaceWords(text, (word: string) => `<<${word}>>`);
      expect(result).toBe(expected);
    });
    
    it('should replace words correctly when dictionary is built with words and values', () => {
      const result = dict2.replaceWords(text, (word: string) => `<<${word}>>`);
      expect(result).toBe(expected);
    });
    
    it('should replace words using replacement map', () => {
      const replacementMap: Record<string, string> = {
        'apple': 'APPLE',
        'pineapple': 'PINEAPPLE'
      };
      const result = dict1.replaceWords(text, replacementMap);
      expect(result).toBe('I like APPLE and PINEAPPLE for breakfast.');
    });
    
    it('should handle overlapping words correctly', () => {
      const overlapDict = buildDictionary(['app', 'apple', 'pineapple']);
      const text = 'app apple pineapple';
      const result = overlapDict.replaceWords(text, (word: string) => `[${word}]`);
      expect(result).toBe('[app] [apple] [pineapple]');
      overlapDict.dispose();
    });
    
    it('should not replace anything if no matches found', () => {
      const text = 'I like grapes';
      const result = dict1.replaceWords(text, (word: string) => `<<${word}>>`);
      expect(result).toBe('I like grapes');
    });
  });
  
  describe('TextDarts', () => {
    let td: any;
    
    beforeEach(() => {
      // 各テスト前にTextDartsオブジェクトを構築
      td = TextDarts.build(words);
    });
    
    afterEach(() => {
      // 各テスト後にリソースを解放
      td.dispose();
    });
    
    it('should replace words correctly using TextDarts', () => {
      const result = td.replaceWords(text, (word: string) => `<<${word}>>`);
      expect(result).toBe(expected);
    });
    
    it('should replace words using replacement map with TextDarts', () => {
      const replacementMap: Record<string, string> = {
        'apple': 'APPLE',
        'pineapple': 'PINEAPPLE'
      };
      const result = td.replaceWords(text, replacementMap);
      expect(result).toBe('I like APPLE and PINEAPPLE for breakfast.');
    });
    
    it('should handle complex text with multiple matches', () => {
      // 単語の境界を考慮したテストケース
      const complexTd = TextDarts.build(['the', 'cat', 'dog', 'mouse']);
      const complexText = 'The cat and the dog chase the mouse.';
      const result = complexTd.replaceWords(complexText, (word: string) => `<${word}>`);
      expect(result).toBe('The <cat> and <the> <dog> chase <the> <mouse>.');
      complexTd.dispose();
    });
  });
});
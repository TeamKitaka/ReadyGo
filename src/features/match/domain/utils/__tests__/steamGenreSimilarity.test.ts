import { describe, it, expect } from 'vitest';
import { calculateGenreSimilarity } from '../steamGenreSimilarity';

describe('calculateGenreSimilarity', () => {
  describe('완전 일치', () => {
    it('should return 100 for identical genres', () => {
      expect(
        calculateGenreSimilarity(['RPG', 'Action'], ['RPG', 'Action'])
      ).toBe(100);
    });

    it('should return 100 for identical genres (different order)', () => {
      expect(
        calculateGenreSimilarity(['Action', 'RPG'], ['RPG', 'Action'])
      ).toBe(100);
    });
  });

  describe('Jaccard 유사도 계산', () => {
    it('should calculate Jaccard similarity correctly (1/4 = 25%)', () => {
      // A = ['RPG', 'Action', 'Adventure'], B = ['RPG', 'Strategy']
      // Intersection: 1 (RPG), Union: 4 → 1/4 = 25%
      expect(
        calculateGenreSimilarity(
          ['RPG', 'Action', 'Adventure'],
          ['RPG', 'Strategy']
        )
      ).toBe(25);
    });

    it('should calculate Jaccard similarity correctly (2/4 = 50%)', () => {
      // A = ['RPG', 'Action'], B = ['RPG', 'Action', 'Strategy', 'FPS']
      // Intersection: 2, Union: 4 → 2/4 = 50%
      expect(
        calculateGenreSimilarity(
          ['RPG', 'Action'],
          ['RPG', 'Action', 'Strategy', 'FPS']
        )
      ).toBe(50);
    });

    it('should calculate Jaccard similarity correctly (2/3 ≈ 67%)', () => {
      // A = ['RPG', 'Action'], B = ['RPG', 'Action', 'Strategy']
      // Intersection: 2, Union: 3 → 2/3 ≈ 66.67% → 67%
      expect(
        calculateGenreSimilarity(
          ['RPG', 'Action'],
          ['RPG', 'Action', 'Strategy']
        )
      ).toBe(67);
    });
  });

  describe('불일치', () => {
    it('should return 0 for no common genres', () => {
      expect(calculateGenreSimilarity(['RPG'], ['FPS'])).toBe(0);
    });

    it('should return 0 for completely different genres', () => {
      expect(
        calculateGenreSimilarity(
          ['RPG', 'Adventure', 'Strategy'],
          ['FPS', 'Sports', 'Racing']
        )
      ).toBe(0);
    });
  });

  describe('대소문자 처리', () => {
    it('should handle case insensitivity', () => {
      expect(
        calculateGenreSimilarity(['rpg', 'ACTION'], ['RPG', 'action'])
      ).toBe(100);
    });

    it('should handle mixed case correctly', () => {
      expect(
        calculateGenreSimilarity(['RpG', 'AcTiOn'], ['rpg', 'action'])
      ).toBe(100);
    });
  });

  describe('공백 처리', () => {
    it('should trim whitespace from genres', () => {
      expect(
        calculateGenreSimilarity([' RPG ', '  Action  '], ['RPG', 'Action'])
      ).toBe(100);
    });

    it('should handle genres with leading/trailing spaces', () => {
      expect(
        calculateGenreSimilarity(['RPG ', ' Action'], [' RPG', 'Action '])
      ).toBe(100);
    });
  });

  describe('빈 배열 처리', () => {
    it('should return 0 when viewer genres are empty', () => {
      expect(calculateGenreSimilarity([], ['RPG'])).toBe(0);
    });

    it('should return 0 when target genres are empty', () => {
      expect(calculateGenreSimilarity(['RPG'], [])).toBe(0);
    });

    it('should return 0 when both genres are empty', () => {
      expect(calculateGenreSimilarity([], [])).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single genre match', () => {
      expect(calculateGenreSimilarity(['RPG'], ['RPG'])).toBe(100);
    });

    it('should handle single genre mismatch', () => {
      expect(calculateGenreSimilarity(['RPG'], ['FPS'])).toBe(0);
    });

    it('should handle duplicate genres in input (treated as set)', () => {
      // ['RPG', 'RPG', 'Action'] → Set(['rpg', 'action'])
      // ['RPG', 'Action'] → Set(['rpg', 'action'])
      expect(
        calculateGenreSimilarity(['RPG', 'RPG', 'Action'], ['RPG', 'Action'])
      ).toBe(100);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { calculateSteamCompatibilityFactor } from '../applySteamBonus';
import type { MatchContextCoreDTO } from '@/commons/types/match/matchContextCore.dto';

describe('calculateSteamCompatibilityFactor', () => {
  describe('Steam 미연동 처리', () => {
    it('should return 1.0 when no Steam data', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1' },
        target: { userId: 't1' },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });

    it('should return 1.0 when viewer has no Steam data', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1' },
        target: { userId: 't1', steam: { steamGames: [1, 2, 3] } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });

    it('should return 1.0 when target has no Steam data', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { steamGames: [1, 2, 3] } },
        target: { userId: 't1' },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });
  });

  describe('공통 게임 보너스 (최대 5%)', () => {
    it('should return 1.0 when no common games', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { steamGames: [1, 2, 3] } },
        target: { userId: 't1', steam: { steamGames: [4, 5, 6] } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });

    it('should add 1% for 1 common game', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { steamGames: [1, 2, 3] } },
        target: { userId: 't1', steam: { steamGames: [1, 4, 5] } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.01);
    });

    it('should add 2% for 2 common games', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { steamGames: [1, 2, 3] } },
        target: { userId: 't1', steam: { steamGames: [2, 3, 4] } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.02);
    });

    it('should add 3% for 3 common games', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { steamGames: [1, 2, 3, 4] } },
        target: { userId: 't1', steam: { steamGames: [2, 3, 4, 5] } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.03);
    });

    it('should add 5% for 5 common games (max)', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { steamGames: [1, 2, 3, 4, 5, 6] } },
        target: { userId: 't1', steam: { steamGames: [1, 2, 3, 4, 5, 7] } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.05);
    });

    it('should cap at 5% even with more than 5 common games', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { steamGames: [1, 2, 3, 4, 5, 6, 7] } },
        target: { userId: 't1', steam: { steamGames: [1, 2, 3, 4, 5, 6, 7] } },
      };
      // 7 common games but capped at 5%
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.05);
    });

    it('should return 1.0 when both have empty game arrays', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { steamGames: [] } },
        target: { userId: 't1', steam: { steamGames: [] } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });
  });

  describe('장르 유사도 보너스 (최대 3%)', () => {
    it('should add 3% for 80%+ genre similarity', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: { mainGenres: ['RPG', 'Action', 'Adventure'] },
        },
        target: {
          userId: 't1',
          steam: { mainGenres: ['RPG', 'Action', 'Adventure'] },
        },
      };
      // 100% similarity → +3%
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.03);
    });

    it('should add 2% for 60-80% genre similarity', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: { mainGenres: ['RPG', 'Action'] },
        },
        target: {
          userId: 't1',
          steam: { mainGenres: ['RPG', 'Action', 'Strategy'] },
        },
      };
      // 2/3 = 67% similarity → +2%
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.02);
    });

    it('should add 1% for 40-60% genre similarity', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: { mainGenres: ['RPG', 'Action'] },
        },
        target: {
          userId: 't1',
          steam: { mainGenres: ['RPG', 'Action', 'Strategy', 'FPS'] },
        },
      };
      // 2/4 = 50% similarity → +1%
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.01);
    });

    it('should add 0% for <40% genre similarity', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: { mainGenres: ['RPG', 'Action', 'Adventure'] },
        },
        target: {
          userId: 't1',
          steam: { mainGenres: ['RPG', 'Strategy'] },
        },
      };
      // 1/4 = 25% similarity → +0%
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });

    it('should return 1.0 when no common genres', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: { mainGenres: ['RPG', 'Action'] },
        },
        target: {
          userId: 't1',
          steam: { mainGenres: ['FPS', 'Sports'] },
        },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });

    it('should return 1.0 when genres are undefined', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: {} },
        target: { userId: 't1', steam: {} },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });
  });

  describe('Play Style 호환성 보너스 (최대 2%)', () => {
    it('should add 2% for same play style', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { playStyle: 'regular' } },
        target: { userId: 't1', steam: { playStyle: 'regular' } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.02);
    });

    it('should add 2% for same casual style', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { playStyle: 'casual' } },
        target: { userId: 't1', steam: { playStyle: 'casual' } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.02);
    });

    it('should add 2% for same hardcore style', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { playStyle: 'hardcore' } },
        target: { userId: 't1', steam: { playStyle: 'hardcore' } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.02);
    });

    it('should add 1% for adjacent style (casual ↔ regular)', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { playStyle: 'casual' } },
        target: { userId: 't1', steam: { playStyle: 'regular' } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.01);
    });

    it('should add 1% for adjacent style (regular ↔ hardcore)', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { playStyle: 'regular' } },
        target: { userId: 't1', steam: { playStyle: 'hardcore' } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.01);
    });

    it('should add 0% for non-adjacent style (casual ↔ hardcore)', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { playStyle: 'casual' } },
        target: { userId: 't1', steam: { playStyle: 'hardcore' } },
      };
      // No penalty, just 0% bonus
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });

    it('should return 1.0 when play style is undefined', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: {} },
        target: { userId: 't1', steam: {} },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });

    it('should return 1.0 when only viewer has play style', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: { playStyle: 'regular' } },
        target: { userId: 't1', steam: {} },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });

    it('should return 1.0 when only target has play style', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1', steam: {} },
        target: { userId: 't1', steam: { playStyle: 'regular' } },
      };
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });
  });

  describe('복합 시나리오 (공통 게임 + 장르 + 스타일)', () => {
    it('should combine common games + genre + style bonuses', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: {
            steamGames: [1, 2, 3],
            mainGenres: ['RPG', 'Action', 'Adventure'],
            playStyle: 'regular',
          },
        },
        target: {
          userId: 't1',
          steam: {
            steamGames: [2, 3, 4],
            mainGenres: ['RPG', 'Action', 'Adventure'],
            playStyle: 'regular',
          },
        },
      };
      // 2 common games (2%) + 100% genre (3%) + same style (2%) = 7%
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.07);
    });

    it('should cap total bonus at 10%', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: {
            steamGames: [1, 2, 3, 4, 5, 6],
            mainGenres: ['RPG', 'Action', 'Adventure'],
            playStyle: 'hardcore',
          },
        },
        target: {
          userId: 't1',
          steam: {
            steamGames: [1, 2, 3, 4, 5, 6],
            mainGenres: ['RPG', 'Action', 'Adventure'],
            playStyle: 'hardcore',
          },
        },
      };
      // 5+ games (5%) + 100% genre (3%) + same style (2%) = 10% (max)
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.1);
    });

    it('should apply partial bonuses correctly', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: {
            steamGames: [1, 2],
            mainGenres: ['RPG', 'Action'],
            playStyle: 'regular',
          },
        },
        target: {
          userId: 't1',
          steam: {
            steamGames: [2, 3],
            mainGenres: ['RPG', 'Action', 'Strategy'],
            playStyle: 'hardcore',
          },
        },
      };
      // 1 common game (1%) + 67% genre (2%) + adjacent style (1%) = 4%
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.04);
    });

    it('should work with only common games', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: { steamGames: [1, 2, 3] },
        },
        target: {
          userId: 't1',
          steam: { steamGames: [2, 3, 4] },
        },
      };
      // 2 common games (2%) only
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.02);
    });

    it('should work with only genre similarity', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: { mainGenres: ['RPG', 'Action'] },
        },
        target: {
          userId: 't1',
          steam: { mainGenres: ['RPG', 'Action', 'Strategy'] },
        },
      };
      // 67% genre (2%) only
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.02);
    });

    it('should work with only play style', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: { playStyle: 'casual' },
        },
        target: {
          userId: 't1',
          steam: { playStyle: 'casual' },
        },
      };
      // Same style (2%) only
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.02);
    });
  });

  describe('최대값 제한 검증', () => {
    it('should never exceed 1.10 factor', () => {
      // Extreme scenario: try to force over 10%
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: {
            steamGames: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            mainGenres: ['RPG', 'Action', 'Adventure'],
            playStyle: 'hardcore',
          },
        },
        target: {
          userId: 't1',
          steam: {
            steamGames: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            mainGenres: ['RPG', 'Action', 'Adventure'],
            playStyle: 'hardcore',
          },
        },
      };
      // Should cap at 1.10
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.1);
    });

    it('should never be less than 1.0', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: {
            steamGames: [1, 2, 3],
            mainGenres: ['RPG', 'Action'],
            playStyle: 'casual',
          },
        },
        target: {
          userId: 't1',
          steam: {
            steamGames: [4, 5, 6],
            mainGenres: ['FPS', 'Sports'],
            playStyle: 'hardcore',
          },
        },
      };
      // No bonuses applied, but should still be 1.0 (no penalty)
      expect(calculateSteamCompatibilityFactor(context)).toBe(1.0);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { generateMatchReasons } from '../generateMatchReasons';
import type { MatchContextCoreDTO } from '@/commons/types/match/matchContextCore.dto';

describe('generateMatchReasons', () => {
  describe('최소 Reason 보장', () => {
    it('should return at least 3 reasons', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1' },
        target: { userId: 't1' },
      };

      const reasons = generateMatchReasons(context);
      expect(reasons.length).toBeGreaterThanOrEqual(3);
    });

    it('should return at least 3 reasons even with minimal data', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          traits: {
            traits: {
              cooperation: 50,
              exploration: 50,
              strategy: 50,
              leadership: 50,
              social: 50,
            },
          },
        },
        target: {
          userId: 't1',
          traits: {
            traits: {
              cooperation: 50,
              exploration: 50,
              strategy: 50,
              leadership: 50,
              social: 50,
            },
          },
        },
      };

      const reasons = generateMatchReasons(context);
      expect(reasons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Steam 연동 Reason 생성', () => {
    it('should generate STEAM_GENRE reason when both have mainGenres (>60% similarity)', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: {
            // 2/3 = 67% similarity
            mainGenres: ['RPG', 'Action'],
          },
        },
        target: {
          userId: 't1',
          steam: {
            mainGenres: ['RPG', 'Action', 'Strategy'],
          },
        },
      };

      const reasons = generateMatchReasons(context);
      const steamGenreReason = reasons.find(
        (r) => r.detail.type === 'STEAM_GENRE'
      );

      expect(steamGenreReason).toBeDefined();
      if (steamGenreReason && steamGenreReason.detail.type === 'STEAM_GENRE') {
        expect(steamGenreReason.detail.genre).toBeDefined();
        expect(steamGenreReason.detail.similarity).toBeGreaterThanOrEqual(60);
        expect(steamGenreReason.priority).toBe('MEDIUM');
      }
    });

    it('should generate STEAM_PLAYSTYLE reason when styles are compatible', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: {
            playStyle: 'regular',
          },
        },
        target: {
          userId: 't1',
          steam: {
            playStyle: 'regular',
          },
        },
      };

      const reasons = generateMatchReasons(context);
      const steamPlayStyleReason = reasons.find(
        (r) => r.detail.type === 'STEAM_PLAYSTYLE'
      );

      expect(steamPlayStyleReason).toBeDefined();
      if (
        steamPlayStyleReason &&
        steamPlayStyleReason.detail.type === 'STEAM_PLAYSTYLE'
      ) {
        expect(steamPlayStyleReason.detail.viewerStyle).toBe('regular');
        expect(steamPlayStyleReason.detail.targetStyle).toBe('regular');
        expect(steamPlayStyleReason.priority).toBe('LOW');
      }
    });

    it('should not generate STEAM_PLAYSTYLE when styles are incompatible (casual ↔ hardcore)', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: {
            playStyle: 'casual',
          },
        },
        target: {
          userId: 't1',
          steam: {
            playStyle: 'hardcore',
          },
        },
      };

      const reasons = generateMatchReasons(context);
      const steamPlayStyleReason = reasons.find(
        (r) => r.detail.type === 'STEAM_PLAYSTYLE'
      );

      // casual ↔ hardcore는 호환되지 않으므로 생성되지 않아야 함
      expect(steamPlayStyleReason).toBeUndefined();
    });
  });

  describe('Steam 미연동 Fallback', () => {
    it('should generate STYLE_SIMILARITY reason when no Steam data', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          traits: {
            traits: {
              cooperation: 80,
              exploration: 70,
              strategy: 60,
              leadership: 50,
              social: 90,
            },
          },
        },
        target: {
          userId: 't1',
          traits: {
            traits: {
              cooperation: 82,
              exploration: 72,
              strategy: 62,
              leadership: 52,
              social: 88,
            },
          },
        },
      };

      const reasons = generateMatchReasons(context);
      const styleSimilarityReason = reasons.find(
        (r) => r.detail.type === 'STYLE_SIMILARITY'
      );

      expect(styleSimilarityReason).toBeDefined();
      if (
        styleSimilarityReason &&
        styleSimilarityReason.detail.type === 'STYLE_SIMILARITY'
      ) {
        expect(styleSimilarityReason.detail.similarityScore).toBeGreaterThan(0);
        expect(styleSimilarityReason.detail.topTrait).toBeDefined();
        expect(styleSimilarityReason.priority).toBe('HIGH');
      }
    });

    it('should generate ACTIVITY_PATTERN reason when schedules exist', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          activity: {
            schedule: [{ dayType: 'weekday', timeSlot: '18-24' }],
          },
        },
        target: {
          userId: 't1',
          activity: {
            schedule: [{ dayType: 'weekday', timeSlot: '18-24' }],
          },
        },
      };

      const reasons = generateMatchReasons(context);
      const activityPatternReason = reasons.find(
        (r) => r.detail.type === 'ACTIVITY_PATTERN'
      );

      expect(activityPatternReason).toBeDefined();
      if (
        activityPatternReason &&
        activityPatternReason.detail.type === 'ACTIVITY_PATTERN'
      ) {
        expect(activityPatternReason.detail.patternScore).toBeGreaterThan(0);
        expect(activityPatternReason.detail.commonTimeSlots).toBeDefined();
        expect(activityPatternReason.priority).toBe('MEDIUM');
      }
    });

    it('should generate ONLINE_NOW reason when target is online', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
        },
        target: {
          userId: 't1',
          activity: {
            isOnline: true,
          },
        },
      };

      const reasons = generateMatchReasons(context);
      const onlineNowReason = reasons.find(
        (r) => r.detail.type === 'ONLINE_NOW'
      );

      expect(onlineNowReason).toBeDefined();
      if (onlineNowReason && onlineNowReason.detail.type === 'ONLINE_NOW') {
        expect(onlineNowReason.detail.isOnline).toBe(true);
        expect(onlineNowReason.priority).toBe('MEDIUM');
      }
    });
  });

  describe('Priority 검증', () => {
    it('should assign HIGH priority to STYLE_SIMILARITY', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          traits: {
            traits: {
              cooperation: 80,
              exploration: 70,
              strategy: 60,
              leadership: 50,
              social: 90,
            },
          },
        },
        target: {
          userId: 't1',
          traits: {
            traits: {
              cooperation: 82,
              exploration: 72,
              strategy: 62,
              leadership: 52,
              social: 88,
            },
          },
        },
      };

      const reasons = generateMatchReasons(context);
      const styleSimilarityReason = reasons.find(
        (r) => r.detail.type === 'STYLE_SIMILARITY'
      );

      expect(styleSimilarityReason?.priority).toBe('HIGH');
    });

    it('should assign MEDIUM priority to ACTIVITY_PATTERN', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          activity: {
            schedule: [{ dayType: 'weekday', timeSlot: '18-24' }],
          },
        },
        target: {
          userId: 't1',
          activity: {
            schedule: [{ dayType: 'weekday', timeSlot: '18-24' }],
          },
        },
      };

      const reasons = generateMatchReasons(context);
      const activityPatternReason = reasons.find(
        (r) => r.detail.type === 'ACTIVITY_PATTERN'
      );

      expect(activityPatternReason?.priority).toBe('MEDIUM');
    });

    it('should assign MEDIUM priority to STEAM_GENRE', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: {
            // 2/3 = 67% similarity
            mainGenres: ['RPG', 'Action'],
          },
        },
        target: {
          userId: 't1',
          steam: {
            mainGenres: ['RPG', 'Action', 'Strategy'],
          },
        },
      };

      const reasons = generateMatchReasons(context);
      const steamGenreReason = reasons.find(
        (r) => r.detail.type === 'STEAM_GENRE'
      );

      expect(steamGenreReason?.priority).toBe('MEDIUM');
    });

    it('should assign LOW priority to STEAM_PLAYSTYLE', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: {
            playStyle: 'regular',
          },
        },
        target: {
          userId: 't1',
          steam: {
            playStyle: 'regular',
          },
        },
      };

      const reasons = generateMatchReasons(context);
      const steamPlayStyleReason = reasons.find(
        (r) => r.detail.type === 'STEAM_PLAYSTYLE'
      );

      expect(steamPlayStyleReason?.priority).toBe('LOW');
    });
  });

  describe('Baseline Reason 생성', () => {
    it('should generate baseline reasons when data is insufficient', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1' },
        target: { userId: 't1' },
      };

      const reasons = generateMatchReasons(context);

      // 최소 3개 보장
      expect(reasons.length).toBeGreaterThanOrEqual(3);

      // Baseline reason 확인
      const baselineReasons = reasons.filter((r) => r.isBaseline === true);
      expect(baselineReasons.length).toBeGreaterThan(0);
    });
  });

  describe('복합 시나리오', () => {
    it('should generate multiple reasons with Steam and traits data', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          traits: {
            traits: {
              cooperation: 80,
              exploration: 70,
              strategy: 60,
              leadership: 50,
              social: 90,
            },
          },
          steam: {
            // 2/3 = 67% similarity
            mainGenres: ['RPG', 'Action'],
            playStyle: 'regular',
          },
          activity: {
            schedule: [{ dayType: 'weekday', timeSlot: '18-24' }],
            isOnline: true,
          },
        },
        target: {
          userId: 't1',
          traits: {
            traits: {
              cooperation: 82,
              exploration: 72,
              strategy: 62,
              leadership: 52,
              social: 88,
            },
          },
          steam: {
            mainGenres: ['RPG', 'Action', 'Strategy'],
            playStyle: 'regular',
          },
          activity: {
            schedule: [{ dayType: 'weekday', timeSlot: '18-24' }],
          },
        },
      };

      const reasons = generateMatchReasons(context);

      // 다양한 reason 타입이 생성되어야 함
      expect(reasons.length).toBeGreaterThan(3);

      const reasonTypes = reasons.map((r) => r.detail.type);
      expect(reasonTypes).toContain('STYLE_SIMILARITY');
      expect(reasonTypes).toContain('STEAM_GENRE');
      expect(reasonTypes).toContain('STEAM_PLAYSTYLE');
      expect(reasonTypes).toContain('ACTIVITY_PATTERN');
    });

    it('should not have duplicate reason types', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          traits: {
            traits: {
              cooperation: 80,
              exploration: 70,
              strategy: 60,
              leadership: 50,
              social: 90,
            },
          },
          steam: {
            mainGenres: ['RPG', 'Action'],
            playStyle: 'regular',
          },
        },
        target: {
          userId: 't1',
          traits: {
            traits: {
              cooperation: 82,
              exploration: 72,
              strategy: 62,
              leadership: 52,
              social: 88,
            },
          },
          steam: {
            mainGenres: ['RPG', 'Strategy'],
            playStyle: 'regular',
          },
        },
      };

      const reasons = generateMatchReasons(context);
      const reasonTypes = reasons.map((r) => r.detail.type);

      // 중복 체크
      const uniqueTypes = new Set(reasonTypes);
      expect(uniqueTypes.size).toBe(reasonTypes.length);
    });
  });
});

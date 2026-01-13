import { describe, it, expect } from 'vitest';
import { generateMatchTags } from '../generateMatchTags';
import type { MatchContextCoreDTO } from '@/commons/types/match/matchContextCore.dto';

describe('generateMatchTags', () => {
  describe('최소 Tag 보장', () => {
    it('should return at least 3 tags', () => {
      const context: MatchContextCoreDTO = {
        viewer: { userId: 'v1' },
        target: { userId: 't1' },
      };

      const tags = generateMatchTags(context);
      expect(tags.length).toBeGreaterThanOrEqual(3);
    });

    it('should return at least 3 tags even with minimal data', () => {
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

      const tags = generateMatchTags(context);
      expect(tags.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Steam 연동 Tag 생성', () => {
    it('should generate "장르일치" tag when genres are similar (>=70%)', () => {
      const context: MatchContextCoreDTO = {
        viewer: {
          userId: 'v1',
          steam: {
            // 2/2 = 100% similarity
            mainGenres: ['RPG', 'Action'],
          },
        },
        target: {
          userId: 't1',
          steam: {
            mainGenres: ['RPG', 'Action'],
          },
        },
      };

      const tags = generateMatchTags(context);
      const genreTag = tags.find((t) => t.label === '장르일치');

      expect(genreTag).toBeDefined();
    });

    it('should generate "플타임유사" tag when play styles match', () => {
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

      const tags = generateMatchTags(context);
      const playStyleTag = tags.find((t) => t.label === '플타임유사');

      expect(playStyleTag).toBeDefined();
    });
  });

  describe('Steam 미연동 Fallback Tag', () => {
    it('should generate tags when no Steam data', () => {
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

      const tags = generateMatchTags(context);

      // 최소 3개 보장
      expect(tags.length).toBeGreaterThanOrEqual(3);

      // 태그는 짧은 문자열 (5-6자 이내)
      tags.forEach((tag) => {
        expect(tag.label).toBeDefined();
        expect(tag.label.length).toBeGreaterThan(0);
        expect(tag.label.length).toBeLessThanOrEqual(10); // 약간 여유 있게
      });
    });

    it('should generate "시간대일치" tag when schedules match', () => {
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

      const tags = generateMatchTags(context);
      const scheduleTag = tags.find((t) => t.label === '시간대일치');

      expect(scheduleTag).toBeDefined();
    });

    it('should generate "지금온라인" tag when target is online', () => {
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

      const tags = generateMatchTags(context);
      const onlineTag = tags.find((t) => t.label === '지금온라인');

      expect(onlineTag).toBeDefined();
    });
  });

  describe('Tag 형식 검증', () => {
    it('should return tags with label property', () => {
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

      const tags = generateMatchTags(context);

      tags.forEach((tag) => {
        expect(tag).toHaveProperty('label');
        expect(typeof tag.label).toBe('string');
      });
    });

    it('should return short labels (5-10 chars)', () => {
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
            mainGenres: ['RPG', 'Action', 'Strategy'],
            playStyle: 'regular',
          },
        },
      };

      const tags = generateMatchTags(context);

      tags.forEach((tag) => {
        expect(tag.label.length).toBeGreaterThan(0);
        expect(tag.label.length).toBeLessThanOrEqual(10);
      });
    });

    it('should not have duplicate tags', () => {
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

      const tags = generateMatchTags(context);
      const labels = tags.map((t) => t.label);
      const uniqueLabels = new Set(labels);

      expect(uniqueLabels.size).toBe(labels.length);
    });
  });

  describe('복합 시나리오', () => {
    it('should generate multiple tags with various data', () => {
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
            isOnline: true,
          },
        },
      };

      const tags = generateMatchTags(context);

      // 다양한 태그가 생성되어야 함
      expect(tags.length).toBeGreaterThan(3);

      // 모든 태그가 유효한 형식
      tags.forEach((tag) => {
        expect(tag.label).toBeDefined();
        expect(typeof tag.label).toBe('string');
        expect(tag.label.length).toBeGreaterThan(0);
      });
    });
  });
});

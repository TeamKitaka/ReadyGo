import { describe, it, expect, vi } from 'vitest';
import * as steamUserStatsRepository from '../steamUserStats.repository';

describe('steamUserStats.repository', () => {
  describe('findByUserId', () => {
    it('should query steam_user_stats by user_id', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            user_id: 'user-123',
            play_style: 'regular',
            avg_weekly_playtime: 15,
            main_genres: ['RPG', 'Action'],
          },
          error: null,
        }),
      };

      const result = await steamUserStatsRepository.findByUserId(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockClient as any,
        'user-123'
      );

      expect(mockClient.from).toHaveBeenCalledWith('steam_user_stats');
      expect(mockClient.select).toHaveBeenCalledWith(
        'play_style, avg_weekly_playtime, main_genres'
      );
      expect(mockClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result.data).toBeDefined();
      expect(result.data?.play_style).toBe('regular');
    });

    it('should return null data when user has no steam stats', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      const result = await steamUserStatsRepository.findByUserId(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockClient as any,
        'user-without-steam'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should upsert steam_user_stats', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      const input = {
        user_id: 'user-123',
        play_style: 'hardcore',
        avg_weekly_playtime: 35,
        main_genres: ['FPS', 'MOBA'],
        active_time_slots: [],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await steamUserStatsRepository.upsert(mockClient as any, input);

      expect(mockClient.from).toHaveBeenCalledWith('steam_user_stats');
      expect(mockClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          play_style: 'hardcore',
          avg_weekly_playtime: 35,
          main_genres: ['FPS', 'MOBA'],
        }),
        { onConflict: 'user_id' }
      );
    });
  });
});


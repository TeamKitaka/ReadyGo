import type { DbClient } from '../types/dbClient.ts';

/**
 * steam_user_stats Repository (Edge Function용)
 * 책임: steam_user_stats 테이블 접근 전담
 */

export type PlayStyle = 'casual' | 'regular' | 'hardcore';

export type SteamUserStatsInput = {
  userId: string;
  playStyle: PlayStyle;
  avgWeeklyPlaytime: number;
  mainGenres: string[];
  activeTimeSlots: string[];
  totalPlaytime2wMinutes?: number;
  genrePlaytime2wMinutes?: Record<string, number>;
  topGenres2w?: string[];
};

/**
 * steam_user_stats를 user_id로 조회
 */
export const findByUserId = async (client: DbClient, userId: string) => {
  return await client
    .from('steam_user_stats')
    .select('play_style, avg_weekly_playtime, main_genres')
    .eq('user_id', userId)
    .maybeSingle();
};

/**
 * steam_user_stats를 upsert
 */
export const upsert = async (client: DbClient, params: SteamUserStatsInput) => {
  return await client.from('steam_user_stats').upsert(
    {
      user_id: params.userId,
      play_style: params.playStyle,
      avg_weekly_playtime: params.avgWeeklyPlaytime,
      main_genres: params.mainGenres,
      active_time_slots: params.activeTimeSlots,
      total_playtime_2w_minutes: params.totalPlaytime2wMinutes ?? null,
      genre_playtime_2w_minutes: params.genrePlaytime2wMinutes
        ? (params.genrePlaytime2wMinutes as any)
        : null,
      top_genres_2w: params.topGenres2w ?? [],
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );
};

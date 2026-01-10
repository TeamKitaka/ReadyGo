import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * steam_user_stats Repository
 * 책임: steam_user_stats 테이블 접근 전담
 */

export type SteamUserStatsRow = {
  user_id: string;
  play_style: string;
  avg_weekly_playtime: number;
  main_genres: string[];
  active_time_slots: string[];
  updated_at: string;
};

/**
 * steam_user_stats를 user_id로 조회
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 * - Supabase 응답 구조를 그대로 반환
 */
export const findByUserId = async (
  client: SupabaseClient<Database>,
  userId: string
) => {
  return await client
    .from('steam_user_stats')
    .select('play_style, avg_weekly_playtime, main_genres')
    .eq('user_id', userId)
    .maybeSingle();
};

/**
 * steam_user_stats를 upsert (선택적 - 현재는 사용 안 함)
 */
export const upsert = async (
  client: SupabaseClient<Database>,
  data: Omit<SteamUserStatsRow, 'updated_at'>
) => {
  return await client.from('steam_user_stats').upsert(
    {
      ...data,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );
};

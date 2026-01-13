import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * steam_user_stats Repository
 * 책임: steam_user_stats 테이블 접근 전담
 * - RLS 우회를 위해 supabaseAdmin 사용 (상대방 프로필 조회 필요)
 */

export type SteamUserStatsRow = {
  user_id: string;
  play_style: string;
  avg_weekly_playtime: number;
  main_genres: string[];
  active_time_slots: string[];
  total_playtime_2w_minutes: number | null;
  genre_playtime_2w_minutes: Record<string, number> | null;
  top_genres_2w: string[];
  updated_at: string;
};

/**
 * steam_user_stats를 user_id로 조회
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 * - Supabase 응답 구조를 그대로 반환
 * - RLS 우회를 위해 supabaseAdmin 사용 (상대방 프로필 조회 필요)
 * @param _client - 사용하지 않음 (supabaseAdmin 사용)
 * @param userId - 조회할 사용자 ID
 */
export const findByUserId = async (_client: unknown, userId: string) => {
  return await supabaseAdmin
    .from('steam_user_stats')
    .select(
      'play_style, avg_weekly_playtime, main_genres, active_time_slots, total_playtime_2w_minutes, genre_playtime_2w_minutes, top_genres_2w'
    )
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

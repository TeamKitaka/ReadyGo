/**
 * Steam User Games Repository
 *
 * 📌 책임:
 * - steam_user_games 테이블 접근 전담
 * - 사용자의 Steam 게임 목록 조회
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * 사용자의 Steam 게임 app_id 목록 조회
 *
 * @param client - Supabase 클라이언트
 * @param userId - 사용자 ID
 * @returns app_id 배열
 */
export const findAppIdsByUserId = async (
  client: SupabaseClient<Database>,
  userId: string
): Promise<{ data: number[] | null; error: any }> => {
  const { data, error } = await client
    .from('steam_user_games')
    .select('app_id')
    .eq('user_id', userId);

  if (error) {
    return { data: null, error };
  }

  const appIds = data?.map((row) => row.app_id) ?? [];
  return { data: appIds, error: null };
};


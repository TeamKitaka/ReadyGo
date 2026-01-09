/**
 * Steam Games Repository
 * 
 * 책임:
 * - steam_games 테이블 조회
 * - 게임 ID → 게임 이름 변환
 * 
 * 비책임:
 * - 비즈니스 로직
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * 게임 ID 배열로 게임 정보 조회
 * 
 * @param client Supabase 클라이언트
 * @param appIds Steam 게임 ID 배열
 * @returns 게임 정보 배열 (app_id, name)
 */
export async function findByAppIds(
  client: SupabaseClient<Database>,
  appIds: number[]
) {
  if (appIds.length === 0) {
    return { data: [], error: null };
  }

  return await client
    .from('steam_games')
    .select('app_id, name')
    .in('app_id', appIds);
}

/**
 * 게임 ID → 게임 이름 맵 생성
 * 
 * @param client Supabase 클라이언트
 * @param appIds Steam 게임 ID 배열
 * @returns Map<appId, gameName>
 */
export async function getGameNameMap(
  client: SupabaseClient<Database>,
  appIds: number[]
): Promise<Map<number, string>> {
  const { data, error } = await findByAppIds(client, appIds);

  if (error || !data) {
    console.error('[steamGames.repository] Failed to fetch game names:', error);
    return new Map();
  }

  return new Map(
    data.map((game) => [game.app_id, game.name || `Game ${game.app_id}`])
  );
}


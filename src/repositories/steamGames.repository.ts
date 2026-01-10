/**
 * Steam Games Repository
 *
 * 책임:
 * - steam_game_info 테이블 조회
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
 * URL 길이 제한 방지를 위해 100개씩 배치 처리
 *
 * @param client Supabase 클라이언트
 * @param appIds Steam 게임 ID 배열
 * @returns 게임 정보 배열 (app_id, name)
 */
export const findByAppIds = async (
  client: SupabaseClient<Database>,
  appIds: number[]
) => {
  if (appIds.length === 0) {
    return { data: [], error: null };
  }

  const CHUNK_SIZE = 100;
  const allData: { app_id: number; name: string | null }[] = [];

  const chunks = Array.from(
    { length: Math.ceil(appIds.length / CHUNK_SIZE) },
    (_, i) => appIds.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
  );

  // eslint-disable-next-line no-restricted-syntax
  for (const chunk of chunks) {
    const { data, error } = await client
      .from('steam_game_info')
      .select('app_id, name')
      .in('app_id', chunk);

    if (error) {
      return { data: null, error };
    }

    if (data) {
      allData.push(...data);
    }
  }

  return { data: allData, error: null };
};

/**
 * 게임 ID → 게임 이름 맵 생성
 *
 * @param client Supabase 클라이언트
 * @param appIds Steam 게임 ID 배열
 * @returns Map<appId, gameName>
 */
export const getGameNameMap = async (
  client: SupabaseClient<Database>,
  appIds: number[]
): Promise<Map<number, string>> => {
  const { data, error } = await findByAppIds(client, appIds);

  if (error || !data) {
    console.error('[steamGames.repository] Failed to fetch game names:', error);
    return new Map();
  }

  return new Map(
    data.map((game) => [game.app_id, game.name || `Game ${game.app_id}`])
  );
};

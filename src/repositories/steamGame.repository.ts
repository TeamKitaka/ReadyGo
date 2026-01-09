import { supabaseAdmin } from '@/lib/supabase/admin';

export type SteamCategoryJson = { id: number; label: string };

export type SteamGameUpsertInput = {
  app_id: number;
  name: string;
  short_description: string | null;
  header_image: string | null;
  genres: string[];
  categories: SteamCategoryJson[];
};

export const upsertSteamGame = async (input: SteamGameUpsertInput) => {
  const { error } = await supabaseAdmin
    .from('steam_game_info')
    .upsert(input, { onConflict: 'app_id' });

  if (error) {
    throw error;
  }
};

/**
 * steam_game_info에 존재하는 app_id 확인
 *
 * 책임:
 * - 여러 app_id가 steam_game_info에 존재하는지 배치 조회
 * - 존재하는 app_id 배열 반환
 *
 * @param appIds - 확인할 app_id 배열
 * @returns 존재하는 app_id 배열
 */
export const checkGameExists = async (appIds: number[]): Promise<number[]> => {
  if (appIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('steam_game_info')
    .select('app_id')
    .in('app_id', appIds);

  if (error) {
    throw error;
  }

  return data.map((row) => row.app_id);
};

/**
 * 특정 게임 정보 조회
 *
 * 책임:
 * - app_id로 게임 정보 조회
 * - app_id, name, header_image, short_description 반환
 *
 * @param appId - 조회할 게임의 app_id
 * @returns 게임 정보 (없으면 null)
 */
export const getSteamGameByAppId = async (appId: number) => {
  const { data, error } = await supabaseAdmin
    .from('steam_game_info')
    .select('app_id, name, header_image, short_description')
    .eq('app_id', appId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw error;
  }

  return data;
};

/**
 * 모든 게임 목록 조회 (검색용)
 *
 * 책임:
 * - steam_game_info 테이블에서 모든 게임 조회
 * - app_id, name만 반환 (검색 성능 최적화)
 * - 이름순 정렬
 *
 * @returns 게임 목록 배열
 */
export const getAllSteamGames = async () => {
  const { data, error } = await supabaseAdmin
    .from('steam_game_info')
    .select('app_id, name')
    .not('name', 'is', null)
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
};

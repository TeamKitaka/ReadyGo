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
 * - URL 길이 제한 방지를 위해 청크 단위로 조회
 *
 * @param appIds - 확인할 app_id 배열
 * @returns 존재하는 app_id 배열
 */
export const checkGameExists = async (appIds: number[]): Promise<number[]> => {
  if (appIds.length === 0) {
    return [];
  }

  // URL 길이 제한 방지: 100개씩 배치 처리
  const CHUNK_SIZE = 100;
  const allExistingIds: number[] = [];

  for (let i = 0; i < appIds.length; i += CHUNK_SIZE) {
    const chunk = appIds.slice(i, i + CHUNK_SIZE);

    const { data, error } = await supabaseAdmin
      .from('steam_game_info')
      .select('app_id')
      .in('app_id', chunk);

    if (error) {
      throw error;
    }

    allExistingIds.push(...data.map((row) => row.app_id));
  }

  return allExistingIds;
};

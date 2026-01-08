import type { DbClient } from '../types/dbClient.ts';

export type SteamCategoryJson = { id: number; label: string };

export type SteamGameUpsertInput = {
  app_id: number;
  name: string;
  short_description: string | null;
  header_image: string | null;
  genres: string[];
  categories: SteamCategoryJson[];
};

export const upsertSteamGame = async (
  client: DbClient,
  input: SteamGameUpsertInput
) => {
  const { error } = await client
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
 * @param client - DbClient 인터페이스
 * @param appIds - 확인할 app_id 배열
 * @returns 존재하는 app_id 배열
 */
export const checkGameExists = async (
  client: DbClient,
  appIds: number[]
): Promise<number[]> => {
  if (appIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from('steam_game_info')
    .select('app_id')
    .in('app_id', appIds);

  if (error) {
    throw error;
  }

  return data.map((row: { app_id: number }) => row.app_id);
};


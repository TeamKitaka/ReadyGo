/**
 * Steam Store API Client
 * 책임: Steam Store API 호출 및 게임 정보 검증
 */

export type SteamCategoryJson = { id: number; label: string };

export type GameInfo = {
  app_id: number;
  name: string;
  short_description: string | null;
  header_image: string | null;
  genres: string[];
  categories: SteamCategoryJson[];
};

export type FetchGameDetailsResult =
  | { ok: true; gameInfo: GameInfo }
  | { ok: false; reason: 'not_found' | 'not_a_game' | 'network_error' };

type SteamAppDetail = {
  type: string;
  name: string;
  short_description?: string;
  header_image?: string;
  genres?: Array<{ description: string }>;
  categories?: Array<{ id: string; description: string }>;
};

/**
 * Steam Store API에서 게임 정보 조회 및 검증
 *
 * 책임:
 * - Steam Store API 호출
 * - type='game' 검증
 * - 게임 정보 매핑
 *
 * 비책임:
 * - DB 저장
 * - 로깅
 *
 * @param appId - Steam app_id
 * @returns Result 객체 (ok: true/false)
 */
export const fetchGameDetails = async (
  appId: number
): Promise<FetchGameDetailsResult> => {
  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=en`,
      {
        headers: {
          'User-Agent': 'ReadyGo/1.0 (Steam Game Service)',
        },
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        reason: 'network_error',
      };
    }

    const json = await response.json();
    const appData = json?.[appId];

    if (!appData?.success || !appData?.data) {
      return {
        ok: false,
        reason: 'not_found',
      };
    }

    const detail: SteamAppDetail = appData.data;

    // type='game'인지 확인
    if (detail.type !== 'game') {
      return {
        ok: false,
        reason: 'not_a_game',
      };
    }

    // 게임 정보 매핑
    const gameInfo: GameInfo = {
      app_id: appId,
      name: detail.name,
      short_description: detail.short_description ?? null,
      header_image: detail.header_image ?? null,
      genres: detail.genres?.map((g) => g.description) ?? [],
      categories:
        detail.categories?.map((c) => ({
          id: Number(c.id),
          label: c.description,
        })) ?? [],
    };

    return {
      ok: true,
      gameInfo,
    };
  } catch (error) {
    console.error(`[Steam Store API] Error fetching app ${appId}:`, error);
    return {
      ok: false,
      reason: 'network_error',
    };
  }
};


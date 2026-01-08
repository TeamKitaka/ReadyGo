/**
 * Steam 게임 데이터 정제 Service
 *
 * 📌 책임 (Responsibility):
 * - steam_user_games에서 의미 있는 게임 집합만 추출
 * - 최근 플레이 게임(40-50개) + 누적 플레이 게임(30-50개) 선별
 * - 총량 상한 80-100개 제한
 * - 게임 카테고리 필터링 (game만 선택)
 *
 * 📌 비책임 (Non-Responsibility):
 * - 장르 분석 및 의미 해석 (steamProfileMetrics.service가 담당)
 * - 매칭 점수 계산 (match domain이 담당)
 * - DB 직접 접근 (repository를 통해 접근)
 */

import { supabase as createClient } from '@/lib/supabase/client';

/**
 * 정제된 게임 데이터
 */
export interface FilteredGame {
  appId: number;
  name: string;
  playtimeForever: number; // 분 단위
  playtimeRecent: number | null; // 분 단위
  lastPlayed: string | null;
  isRecentlyPlayed: boolean;
}

/**
 * 의미 있는 게임 목록 필터링
 *
 * 정제 기준:
 * 1. 최근 2주 플레이 게임 (playtime_recent > 0)
 *    - playtime_recent 내림차순 정렬
 *    - 상위 40~50개 선택
 *
 * 2. 나머지 게임 (위에 포함되지 않은 게임)
 *    - playtime_forever 내림차순 정렬
 *    - 상위 30~50개 추가 선택
 *
 * 3. 총량 상한 제한
 *    - 최종 선택 게임 수: 80~100개
 *
 * 4. 게임 카테고리 필터링
 *    - steam_game_info.categories에서 "game" 확인
 *    - tool, demo, soundtrack 등 제외
 *
 * @param userId - 유저 ID
 * @returns 정제된 게임 목록
 */
export const filterMeaningfulGames = async (
  userId: string
): Promise<FilteredGame[]> => {
  const supabase = createClient;

  // 1. 유저의 모든 게임 조회
  const { data: userGames, error: gamesError } = await supabase
    .from('steam_user_games')
    .select('app_id, name, playtime_forever, playtime_recent, last_played')
    .eq('user_id', userId);

  if (gamesError) {
    throw new Error(
      `Failed to fetch user games: ${gamesError.message}`
    );
  }

  if (!userGames || userGames.length === 0) {
    return [];
  }

  // 2. 게임 카테고리 필터링 (game만 선택)
  const appIds = userGames.map((g) => g.app_id);
  const { data: gameInfos, error: infoError } = await supabase
    .from('steam_game_info')
    .select('app_id, categories')
    .in('app_id', appIds);

  if (infoError) {
    throw new Error(
      `Failed to fetch game info: ${infoError.message}`
    );
  }

  // 게임 카테고리 확인: categories 배열에 { id: number, label: string }[] 형태로 저장됨
  // "game" 카테고리만 필터링
  const validGameIds = new Set<number>();
  if (gameInfos) {
    for (const info of gameInfos) {
      // categories가 jsonb[] 형태이므로 확인
      if (info.categories && Array.isArray(info.categories)) {
        // 카테고리 중 하나라도 게임 관련이면 포함
        const isGame = info.categories.some((cat: any) => {
          const label = cat?.label?.toLowerCase() || '';
          return (
            label.includes('game') &&
            !label.includes('tool') &&
            !label.includes('demo') &&
            !label.includes('soundtrack')
          );
        });
        if (isGame) {
          validGameIds.add(info.app_id);
        }
      } else {
        // 카테고리 정보가 없으면 포함 (보수적 접근)
        validGameIds.add(info.app_id);
      }
    }
  }

  // 유효한 게임만 필터링
  const validGames = userGames.filter((g) => validGameIds.has(g.app_id));

  // 3. 최근 플레이 게임과 누적 플레이 게임 분리
  const recentGames = validGames
    .filter((g) => g.playtime_recent && g.playtime_recent > 0)
    .sort((a, b) => (b.playtime_recent || 0) - (a.playtime_recent || 0));

  const recentGameIds = new Set(recentGames.map((g) => g.app_id));

  const totalGames = validGames
    .filter((g) => !recentGameIds.has(g.app_id))
    .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));

  // 4. 상위 게임 선택 (최근 40-50개, 누적 30-50개)
  const RECENT_LIMIT = 50;
  const TOTAL_LIMIT = 50;
  const MAX_TOTAL_GAMES = 100;

  const selectedRecent = recentGames.slice(0, RECENT_LIMIT);
  const selectedTotal = totalGames.slice(0, TOTAL_LIMIT);

  // 5. 합쳐서 총량 상한 제한
  const combined = [...selectedRecent, ...selectedTotal].slice(
    0,
    MAX_TOTAL_GAMES
  );

  // 6. FilteredGame 형태로 변환
  return combined.map((game) => ({
    appId: game.app_id,
    name: game.name || '',
    playtimeForever: game.playtime_forever || 0,
    playtimeRecent: game.playtime_recent,
    lastPlayed: game.last_played,
    isRecentlyPlayed: recentGameIds.has(game.app_id),
  }));
};

/**
 * 가중치 플레이타임 계산
 *
 * ⚠️ 중요: 이 함수는 "비율만 계산"
 * - 장르나 의미 해석 금지
 * - 단순히 정규화된 수치만 반환
 *
 * 계산 방식:
 * weightedPlaytime =
 *   recentRatio * normalize(playtimeRecent) +
 *   totalRatio * normalize(playtimeForever)
 *
 * @param game - 필터링된 게임
 * @param recentRatio - 최근 플레이 가중치 (기본 0.65)
 * @param totalRatio - 누적 플레이 가중치 (기본 0.35)
 * @returns 가중치가 적용된 플레이타임 (분 단위)
 */
export const calculateWeightedPlaytime = (
  game: FilteredGame,
  recentRatio: number = 0.65,
  totalRatio: number = 0.35
): number => {
  const recent = game.playtimeRecent || 0;
  const total = game.playtimeForever || 0;

  // 정규화: 최근 플레이가 있으면 최근을 우선, 없으면 누적만 사용
  if (recent > 0) {
    // 최근 플레이타임이 있는 경우
    // - 최근 플레이타임에 높은 가중치 (65%)
    // - 누적 플레이타임에 낮은 가중치 (35%)
    return recent * recentRatio + total * totalRatio;
  } else {
    // 최근 플레이타임이 없는 경우
    // - 누적 플레이타임만 사용 (100%)
    return total;
  }
};


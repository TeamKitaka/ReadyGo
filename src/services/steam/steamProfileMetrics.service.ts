/**
 * Steam 프로필 지표 계산 Service
 *
 * 📌 책임 (Responsibility):
 * - Steam 게임 데이터로부터 프로필 지표 계산
 * - 활동 지표 (총 플레이타임, 주당 평균, 최근 활동 여부)
 * - 장르 프로필 (상위 3개 장르 추출)
 * - Play Style 분류 (casual, regular, hardcore)
 *
 * 📌 비책임 (Non-Responsibility):
 * - 매칭 점수 계산 (match domain이 담당)
 * - DB 직접 접근 (repository를 통해 접근)
 */

import { supabase as createClient } from '@/lib/supabase/client';
import {
  type FilteredGame,
  calculateWeightedPlaytime,
} from './steamDataFilter.service';

/**
 * Play Style 분류
 */
export type PlayStyle = 'casual' | 'regular' | 'hardcore';

/**
 * 활동 지표
 */
export interface ActivityMetrics {
  totalPlaytimeHours: number;
  avgWeeklyPlaytimeHours: number | null;
  hasRecentActivity: boolean;
}

/**
 * 장르 프로필
 */
export interface GenreProfile {
  topGenres: Array<{ genre: string; percentage: number }>;
  mainGenres: string[]; // 상위 3개
}

/**
 * 활동 지표 계산
 *
 * avgWeeklyPlaytime 계산 기준:
 * 1. 최근 2주 데이터가 있으면 → recent 기준 (더 정확)
 * 2. 없으면 → total / (계정 생성 후 주 수)
 * 3. 계정 생성일도 없으면 → null 반환 (주당 평균 계산 불가)
 *
 * @param games - 필터링된 게임 목록
 * @param accountCreatedAt - Steam 계정 생성일 (선택)
 * @returns 활동 지표
 */
export const calculateActivityMetrics = (
  games: FilteredGame[],
  accountCreatedAt?: Date
): ActivityMetrics => {
  // 총 플레이타임 계산 (분 → 시간)
  const totalPlaytimeMinutes = games.reduce(
    (sum, game) => sum + game.playtimeForever,
    0
  );
  const totalPlaytimeHours = Math.round(totalPlaytimeMinutes / 60);

  // 최근 플레이타임 계산 (최근 2주)
  const recentPlaytimeMinutes = games.reduce(
    (sum, game) => sum + (game.playtimeRecent || 0),
    0
  );

  const hasRecentActivity = recentPlaytimeMinutes > 0;

  // 주당 평균 플레이타임 계산
  let avgWeeklyPlaytimeHours: number | null = null;

  if (hasRecentActivity) {
    // 1. 최근 2주 데이터가 있으면 → recent 기준 (더 정확)
    avgWeeklyPlaytimeHours = Math.round(recentPlaytimeMinutes / 60 / 2);
  } else if (accountCreatedAt) {
    // 2. 없으면 → total / (계정 생성 후 주 수)
    const now = new Date();
    const weeksSinceCreation =
      (now.getTime() - accountCreatedAt.getTime()) / (7 * 24 * 60 * 60 * 1000);
    if (weeksSinceCreation > 0) {
      avgWeeklyPlaytimeHours = Math.round(
        totalPlaytimeMinutes / 60 / weeksSinceCreation
      );
    }
  }
  // 3. 계정 생성일도 없으면 → null 반환

  return {
    totalPlaytimeHours,
    avgWeeklyPlaytimeHours,
    hasRecentActivity,
  };
};

/**
 * 장르 프로필 분석
 *
 * 계산 방식:
 * 1. 각 게임의 가중치 플레이타임 계산 (최근 65%, 누적 35%)
 * 2. steam_game_info.genres 조회
 * 3. 장르별 가중 플레이타임 집계
 * 4. 비율로 변환 및 상위 3개 추출
 *
 * @param games - 필터링된 게임 목록
 * @returns 장르 프로필
 */
export const analyzeGenreProfile = async (
  games: FilteredGame[]
): Promise<GenreProfile> => {
  if (games.length === 0) {
    return {
      topGenres: [],
      mainGenres: [],
    };
  }

  const supabase = createClient;

  // 1. steam_game_info에서 장르 정보 조회
  const appIds = games.map((g) => g.appId);
  const { data: gameInfos, error } = await supabase
    .from('steam_game_info')
    .select('app_id, genres')
    .in('app_id', appIds);

  if (error) {
    throw new Error(`Failed to fetch game genres: ${error.message}`);
  }

  // 2. 장르별 가중 플레이타임 집계
  const genreMap = new Map<string, number>();

  for (const game of games) {
    // 게임의 가중 플레이타임 계산
    const weightedPlaytime = calculateWeightedPlaytime(game);

    // 해당 게임의 장르 찾기
    const gameInfo = gameInfos?.find((info) => info.app_id === game.appId);
    if (!gameInfo || !gameInfo.genres || !Array.isArray(gameInfo.genres)) {
      continue;
    }

    // 각 장르에 가중 플레이타임 추가
    for (const genre of gameInfo.genres) {
      if (typeof genre === 'string' && genre.trim()) {
        const current = genreMap.get(genre) || 0;
        genreMap.set(genre, current + weightedPlaytime);
      }
    }
  }

  // 3. 비율로 변환
  const totalWeightedPlaytime = Array.from(genreMap.values()).reduce(
    (sum, val) => sum + val,
    0
  );

  if (totalWeightedPlaytime === 0) {
    return {
      topGenres: [],
      mainGenres: [],
    };
  }

  const genrePercentages = Array.from(genreMap.entries())
    .map(([genre, playtime]) => ({
      genre,
      percentage: Math.round((playtime / totalWeightedPlaytime) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // 4. 상위 3개 추출
  const topGenres = genrePercentages.slice(0, 10); // UI용으로 상위 10개 반환
  const mainGenres = genrePercentages.slice(0, 3).map((g) => g.genre);

  return {
    topGenres,
    mainGenres,
  };
};

/**
 * Play Style 분류
 *
 * ⚠️ 중요: PlayStyle은 "설명/보정용"
 * - 매칭 점수 계산에 직접 사용되지 않음
 * - Steam Compatibility Factor 계산 시 보정용으로만 사용
 * - 절대 감점하지 않음 (동일: +2%, 인접: +1%, 불일치: +0%)
 *
 * 분류 기준:
 * - casual: 주당 평균 < 10시간
 * - regular: 주당 평균 10~30시간
 * - hardcore: 주당 평균 > 30시간
 *
 * @param metrics - 활동 지표
 * @returns Play Style
 */
export const classifyPlayStyle = (metrics: ActivityMetrics): PlayStyle => {
  const avgWeekly = metrics.avgWeeklyPlaytimeHours;

  // 주당 평균을 계산할 수 없으면 casual로 분류 (보수적 접근)
  if (avgWeekly === null || avgWeekly === undefined) {
    return 'casual';
  }

  if (avgWeekly < 10) {
    return 'casual';
  } else if (avgWeekly <= 30) {
    return 'regular';
  } else {
    return 'hardcore';
  }
};

/**
 * total_playtime_2w_minutes 계산
 * 모든 게임의 playtime_recent 합계 (분 단위)
 */
const calculateTotalPlaytime2w = (games: FilteredGame[]): number => {
  return games.reduce((sum, game) => {
    return sum + (game.playtimeRecent || 0);
  }, 0);
};

/**
 * 게임 장르 정보 조회 (배치 처리, CHUNK_SIZE = 100)
 * 성능 최적화: Map<app_id, genres[]> 반환
 */
const fetchGameGenres = async (
  appIds: number[]
): Promise<Map<number, string[]>> => {
  const gameInfoMap = new Map<number, string[]>();
  const CHUNK_SIZE = 100;
  const supabase = createClient;

  // 배열을 chunk로 나누기
  const chunks = Array.from(
    { length: Math.ceil(appIds.length / CHUNK_SIZE) },
    (_, i) => appIds.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
  );

  // 각 chunk를 순차적으로 처리
  await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabase
        .from('steam_game_info')
        .select('app_id, genres')
        .in('app_id', chunk);

      if (error) {
        throw new Error(`Failed to fetch game genres: ${error.message}`);
      }

      if (data) {
        data.forEach((info) => {
          if (info.genres && Array.isArray(info.genres)) {
            gameInfoMap.set(
              info.app_id,
              info.genres.filter(
                (g): g is string => typeof g === 'string' && g.trim() !== ''
              )
            );
          }
        });
      }
    })
  );

  return gameInfoMap;
};

/**
 * genre_playtime_2w_minutes 계산
 * 장르별 playtime_2weeks 합계 (중복 포함, 분 단위)
 */
const calculateGenrePlaytime2w = async (
  games: FilteredGame[]
): Promise<Record<string, number>> => {
  // playtime_recent가 0보다 큰 게임만 필터링
  const gamesWithPlaytime = games.filter((g) => (g.playtimeRecent || 0) > 0);

  if (gamesWithPlaytime.length === 0) {
    return {};
  }

  // steam_game_info에서 장르 정보 조회 (배치 처리, Map으로 반환)
  const appIds = gamesWithPlaytime.map((g) => g.appId);
  const gameInfoMap = await fetchGameGenres(appIds);

  // 장르별 playtime 합산 (중복 포함)
  const genreMap = new Map<string, number>();

  gamesWithPlaytime.forEach((game) => {
    const playtime = game.playtimeRecent || 0;
    if (playtime === 0) {
      return;
    }

    const genres = gameInfoMap.get(game.appId);
    if (!genres || genres.length === 0) {
      return;
    }

    // 게임이 여러 장르를 가지면 각 장르에 전체 playtime 추가
    genres.forEach((genre) => {
      const current = genreMap.get(genre) || 0;
      genreMap.set(genre, current + playtime);
    });
  });

  // Map을 Record로 변환 (0분 장르 제외)
  const result: Record<string, number> = {};
  Array.from(genreMap.entries()).forEach(([genre, minutes]) => {
    if (minutes > 0) {
      result[genre] = minutes;
    }
  });

  return result;
};

/**
 * top_genres_2w 계산
 * genre_playtime_2w_minutes 기준으로 상위 N개 장르 선택
 */
const calculateTopGenres2w = (
  genrePlaytime: Record<string, number>,
  limit: number = 5
): string[] => {
  return Object.entries(genrePlaytime)
    .sort(([, a], [, b]) => b - a) // 분 내림차순
    .slice(0, limit)
    .map(([genre]) => genre);
};

/**
 * steam_user_stats 업데이트
 *
 * @param userId - 유저 ID
 * @param games - 필터링된 게임 목록
 * @param accountCreatedAt - Steam 계정 생성일 (선택)
 */
export const updateSteamUserStats = async (
  userId: string,
  games: FilteredGame[],
  accountCreatedAt?: Date
): Promise<void> => {
  // 1. 활동 지표 계산
  const activityMetrics = calculateActivityMetrics(games, accountCreatedAt);

  // 2. 장르 프로필 분석
  const genreProfile = await analyzeGenreProfile(games);

  // 3. Play Style 분류
  const playStyle = classifyPlayStyle(activityMetrics);

  // 4. 2주 집계 계산
  const totalPlaytime2wMinutes = calculateTotalPlaytime2w(games);
  const genrePlaytime2wMinutes = await calculateGenrePlaytime2w(games);
  const topGenres2w = calculateTopGenres2w(genrePlaytime2wMinutes);

  // 5. steam_user_stats 업데이트
  const supabase = createClient;

  const { error } = await supabase.from('steam_user_stats').upsert(
    {
      user_id: userId,
      play_style: playStyle,
      avg_weekly_playtime: activityMetrics.avgWeeklyPlaytimeHours || 0,
      main_genres: genreProfile.mainGenres,
      active_time_slots: [], // 추후 확장용 (현재는 빈 배열)
      total_playtime_2w_minutes: totalPlaytime2wMinutes,
      genre_playtime_2w_minutes: genrePlaytime2wMinutes,
      top_genres_2w: topGenres2w,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );

  if (error) {
    throw new Error(`Failed to update steam_user_stats: ${error.message}`);
  }
};

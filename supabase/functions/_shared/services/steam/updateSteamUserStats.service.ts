/**
 * Steam User Stats 업데이트 Service (Edge Function용)
 *
 * 📌 책임:
 * - Edge Function 환경에서 steam_user_stats 업데이트
 * - filterMeaningfulGames, calculateActivityMetrics, analyzeGenreProfile 통합
 */

import type { DbClient } from '../../types/dbClient.ts';
import * as steamUserStatsRepository from '../../repositories/steamUserStats.repository.ts';

export type PlayStyle = 'casual' | 'regular' | 'hardcore';

interface FilteredGame {
  appId: number;
  name: string;
  playtimeForever: number;
  playtimeRecent: number | null;
  lastPlayed: string | null;
  isRecentlyPlayed: boolean;
}

interface ActivityMetrics {
  totalPlaytimeHours: number;
  avgWeeklyPlaytimeHours: number; // 항상 계산됨 (최근 2주 기준)
  hasRecentActivity: boolean;
}

/**
 * 의미 있는 게임 목록 필터링
 */
const filterMeaningfulGames = async (
  client: DbClient,
  userId: string
): Promise<FilteredGame[]> => {
  // 1. 유저의 모든 게임 조회
  const { data: userGames, error: gamesError } = await client
    .from('steam_user_games')
    .select('app_id, name, playtime_forever, playtime_recent, last_played')
    .eq('user_id', userId);

  if (gamesError) {
    throw new Error(`Failed to fetch user games: ${gamesError.message}`);
  }

  if (!userGames || userGames.length === 0) {
    return [];
  }

  // 2. 게임 카테고리 필터링 (배치 처리로 URL 길이 제한 방지)
  const appIds = userGames.map((g) => g.app_id);
  const CHUNK_SIZE = 100;
  const gameInfos: any[] = [];

  for (let i = 0; i < appIds.length; i += CHUNK_SIZE) {
    const chunk = appIds.slice(i, i + CHUNK_SIZE);
    const { data, error: infoError } = await client
      .from('steam_game_info')
      .select('app_id, categories')
      .in('app_id', chunk);

    if (infoError) {
      throw new Error(`Failed to fetch game info: ${infoError.message}`);
    }

    if (data) {
      gameInfos.push(...data);
    }
  }

  // 플레이 시간이 5분 이상인 모든 게임을 포함
  // (가중치 함수를 통해 짧은 플레이타임 게임의 영향력은 자동으로 감소)
  const validGames = userGames.filter((g) => g.playtime_forever >= 5);

  // 3. 최근 플레이 게임과 누적 플레이 게임 분리
  const recentGames = validGames
    .filter((g) => g.playtime_recent && g.playtime_recent > 0)
    .sort((a, b) => (b.playtime_recent || 0) - (a.playtime_recent || 0));

  const recentGameIds = new Set(recentGames.map((g) => g.app_id));

  const totalGames = validGames
    .filter((g) => !recentGameIds.has(g.app_id))
    .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));

  // 4. 상위 게임 선택
  const RECENT_LIMIT = 50;
  const TOTAL_LIMIT = 50;
  const MAX_TOTAL_GAMES = 100;

  const selectedRecent = recentGames.slice(0, RECENT_LIMIT);
  const selectedTotal = totalGames.slice(0, TOTAL_LIMIT);
  const combined = [...selectedRecent, ...selectedTotal].slice(
    0,
    MAX_TOTAL_GAMES
  );

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
 * 플레이타임 기반 관심도 가중치 계산
 *
 * 로그 스케일 적용:
 * - 0분: 0 (완전 제외)
 * - 10분: ~0.14
 * - 30분: ~0.26
 * - 60분: ~0.36
 * - 300분(5시간): ~0.60
 * - 1000분(~16시간): ~0.78
 * - 6000분(100시간): ~1.0
 */
const calculatePlaytimeWeight = (playtimeMinutes: number): number => {
  if (playtimeMinutes <= 0) return 0;

  // 로그 스케일: log10(playtime + 1) / log10(6000)
  // 6000분(100시간) 이상이면 1.0
  const weight = Math.log10(playtimeMinutes + 1) / Math.log10(6000);
  return Math.min(1.0, weight);
};

/**
 * 가중치 플레이타임 계산 (최근성 + 총 플레이타임 + 관심도 가중치)
 */
const calculateWeightedPlaytime = (
  game: FilteredGame,
  recentRatio: number = 0.65,
  totalRatio: number = 0.35
): number => {
  const recent = game.playtimeRecent || 0;
  const total = game.playtimeForever || 0;

  // 기본 가중치 플레이타임 계산
  let basePlaytime: number;
  if (recent > 0) {
    basePlaytime = recent * recentRatio + total * totalRatio;
  } else {
    basePlaytime = total;
  }

  // 관심도 가중치 적용
  const interestWeight = calculatePlaytimeWeight(total);

  return basePlaytime * interestWeight;
};

/**
 * 활동 지표 계산 (최근 2주 기준)
 */
const calculateActivityMetrics = (games: FilteredGame[]): ActivityMetrics => {
  const totalPlaytimeMinutes = games.reduce(
    (sum, game) => sum + game.playtimeForever,
    0
  );
  const totalPlaytimeHours = Math.round(totalPlaytimeMinutes / 60);

  const recentPlaytimeMinutes = games.reduce(
    (sum, game) => sum + (game.playtimeRecent || 0),
    0
  );

  const hasRecentActivity = recentPlaytimeMinutes > 0;

  // 최근 2주 플레이 시간만 사용 (주당 평균)
  const avgWeeklyPlaytimeHours = Math.round(recentPlaytimeMinutes / 60 / 2);

  return {
    totalPlaytimeHours,
    avgWeeklyPlaytimeHours,
    hasRecentActivity,
  };
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
  client: DbClient,
  appIds: number[]
): Promise<Map<number, string[]>> => {
  const gameInfoMap = new Map<number, string[]>();
  const CHUNK_SIZE = 100;

  for (let i = 0; i < appIds.length; i += CHUNK_SIZE) {
    const chunk = appIds.slice(i, i + CHUNK_SIZE);
    const { data, error } = await client
      .from('steam_game_info')
      .select('app_id, genres')
      .in('app_id', chunk);

    if (error) {
      throw new Error(`Failed to fetch game genres: ${error.message}`);
    }

    if (data) {
      for (const info of data) {
        if (info.genres && Array.isArray(info.genres)) {
          gameInfoMap.set(
            info.app_id,
            info.genres.filter(
              (g): g is string => typeof g === 'string' && g.trim() !== ''
            )
          );
        }
      }
    }
  }

  return gameInfoMap;
};

/**
 * genre_playtime_2w_minutes 계산
 * 장르별 playtime_2weeks 합계 (중복 포함, 분 단위)
 */
const calculateGenrePlaytime2w = async (
  client: DbClient,
  games: FilteredGame[]
): Promise<Record<string, number>> => {
  // playtime_recent가 0보다 큰 게임만 필터링
  const gamesWithPlaytime = games.filter(
    (g) => (g.playtimeRecent || 0) > 0
  );

  if (gamesWithPlaytime.length === 0) {
    return {};
  }

  // steam_game_info에서 장르 정보 조회 (배치 처리, Map으로 반환)
  const appIds = gamesWithPlaytime.map((g) => g.appId);
  const gameInfoMap = await fetchGameGenres(client, appIds);

  // 장르별 playtime 합산 (중복 포함)
  const genreMap = new Map<string, number>();

  for (const game of gamesWithPlaytime) {
    const playtime = game.playtimeRecent || 0;
    if (playtime === 0) continue;

    const genres = gameInfoMap.get(game.appId);
    if (!genres || genres.length === 0) {
      continue;
    }

    // 게임이 여러 장르를 가지면 각 장르에 전체 playtime 추가
    for (const genre of genres) {
      const current = genreMap.get(genre) || 0;
      genreMap.set(genre, current + playtime);
    }
  }

  // Map을 Record로 변환 (0분 장르 제외)
  const result: Record<string, number> = {};
  for (const [genre, minutes] of genreMap.entries()) {
    if (minutes > 0) {
      result[genre] = minutes;
    }
  }

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
 * 장르 프로필 분석
 */
const analyzeGenreProfile = async (
  client: DbClient,
  games: FilteredGame[]
): Promise<{ mainGenres: string[] }> => {
  if (games.length === 0) {
    return { mainGenres: [] };
  }

  // 배치 처리로 URL 길이 제한 방지
  const appIds = games.map((g) => g.appId);
  const CHUNK_SIZE = 100;
  const gameInfos: any[] = [];

  for (let i = 0; i < appIds.length; i += CHUNK_SIZE) {
    const chunk = appIds.slice(i, i + CHUNK_SIZE);
    const { data, error } = await client
      .from('steam_game_info')
      .select('app_id, genres')
      .in('app_id', chunk);

    if (error) {
      throw new Error(`Failed to fetch game genres: ${error.message}`);
    }

    if (data) {
      gameInfos.push(...data);
    }
  }

  const genreMap = new Map<string, number>();

  for (const game of games) {
    const weightedPlaytime = calculateWeightedPlaytime(game);
    const gameInfo = gameInfos?.find((info) => info.app_id === game.appId);

    if (!gameInfo || !gameInfo.genres || !Array.isArray(gameInfo.genres)) {
      continue;
    }

    for (const genre of gameInfo.genres) {
      if (typeof genre === 'string' && genre.trim()) {
        const current = genreMap.get(genre) || 0;
        genreMap.set(genre, current + weightedPlaytime);
      }
    }
  }

  const totalWeightedPlaytime = Array.from(genreMap.values()).reduce(
    (sum, val) => sum + val,
    0
  );

  if (totalWeightedPlaytime === 0) {
    return { mainGenres: [] };
  }

  const genrePercentages = Array.from(genreMap.entries())
    .map(([genre, playtime]) => ({
      genre,
      percentage: (playtime / totalWeightedPlaytime) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const mainGenres = genrePercentages.slice(0, 3).map((g) => g.genre);

  return { mainGenres };
};

/**
 * Play Style 분류 (최근 2주 활동 기준)
 */
const classifyPlayStyle = (metrics: ActivityMetrics): PlayStyle => {
  const avgWeekly = metrics.avgWeeklyPlaytimeHours;

  if (avgWeekly === null || avgWeekly === undefined || avgWeekly < 5) {
    return 'casual'; // 주 5시간 미만
  } else if (avgWeekly <= 20) {
    return 'regular'; // 주 5~20시간
  } else {
    return 'hardcore'; // 주 20시간 이상
  }
};

/**
 * steam_user_stats 업데이트 (최근 2주 기준)
 */
export const updateSteamUserStats = async (
  client: DbClient,
  userId: string
): Promise<void> => {
  console.log(`[UpdateStats] Starting for user ${userId}`);

  // 1. 의미 있는 게임 필터링
  const games = await filterMeaningfulGames(client, userId);
  console.log(`[UpdateStats] Filtered ${games.length} meaningful games`);

  if (games.length === 0) {
    console.log(`[UpdateStats] No games found, skipping stats update`);
    return;
  }

  // 2. 활동 지표 계산 (최근 2주 기준)
  const activityMetrics = calculateActivityMetrics(games);
  console.log(
    `[UpdateStats] Activity metrics:`,
    JSON.stringify(activityMetrics)
  );

  // 3. 장르 프로필 분석
  const genreProfile = await analyzeGenreProfile(client, games);
  console.log(
    `[UpdateStats] Main genres:`,
    JSON.stringify(genreProfile.mainGenres)
  );

  // 4. Play Style 분류
  const playStyle = classifyPlayStyle(activityMetrics);
  console.log(`[UpdateStats] Play style: ${playStyle}`);

  // 5. 2주 집계 계산
  const totalPlaytime2wMinutes = calculateTotalPlaytime2w(games);
  console.log(
    `[UpdateStats] Total playtime 2w: ${totalPlaytime2wMinutes} minutes`
  );

  const genrePlaytime2wMinutes = await calculateGenrePlaytime2w(client, games);
  console.log(
    `[UpdateStats] Genre playtime 2w:`,
    JSON.stringify(genrePlaytime2wMinutes)
  );

  const topGenres2w = calculateTopGenres2w(genrePlaytime2wMinutes);
  console.log(`[UpdateStats] Top genres 2w:`, JSON.stringify(topGenres2w));

  // 6. steam_user_stats 업데이트
  const { error } = await steamUserStatsRepository.upsert(client, {
    userId,
    playStyle,
    avgWeeklyPlaytime: activityMetrics.avgWeeklyPlaytimeHours || 0,
    mainGenres: genreProfile.mainGenres,
    activeTimeSlots: [],
    totalPlaytime2wMinutes,
    genrePlaytime2wMinutes,
    topGenres2w,
  });

  if (error) {
    throw new Error(`Failed to update steam_user_stats: ${error.message}`);
  }

  console.log(`[UpdateStats] Successfully updated steam_user_stats`);
};

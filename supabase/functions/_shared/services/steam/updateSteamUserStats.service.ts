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
  avgWeeklyPlaytimeHours: number | null;
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

  // 2. 게임 카테고리 필터링
  const appIds = userGames.map((g) => g.app_id);
  const { data: gameInfos, error: infoError } = await client
    .from('steam_game_info')
    .select('app_id, categories')
    .in('app_id', appIds);

  if (infoError) {
    throw new Error(`Failed to fetch game info: ${infoError.message}`);
  }

  const validGameIds = new Set<number>();
  if (gameInfos) {
    for (const info of gameInfos) {
      if (info.categories && Array.isArray(info.categories)) {
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
        validGameIds.add(info.app_id);
      }
    }
  }

  const validGames = userGames.filter((g) => validGameIds.has(g.app_id));

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
 * 가중치 플레이타임 계산
 */
const calculateWeightedPlaytime = (
  game: FilteredGame,
  recentRatio: number = 0.65,
  totalRatio: number = 0.35
): number => {
  const recent = game.playtimeRecent || 0;
  const total = game.playtimeForever || 0;

  if (recent > 0) {
    return recent * recentRatio + total * totalRatio;
  } else {
    return total;
  }
};

/**
 * 활동 지표 계산
 */
const calculateActivityMetrics = (
  games: FilteredGame[],
  accountCreatedAt?: Date
): ActivityMetrics => {
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

  let avgWeeklyPlaytimeHours: number | null = null;

  if (hasRecentActivity) {
    avgWeeklyPlaytimeHours = Math.round(recentPlaytimeMinutes / 60 / 2);
  } else if (accountCreatedAt) {
    const now = new Date();
    const weeksSinceCreation =
      (now.getTime() - accountCreatedAt.getTime()) /
      (7 * 24 * 60 * 60 * 1000);
    if (weeksSinceCreation > 0) {
      avgWeeklyPlaytimeHours = Math.round(
        totalPlaytimeMinutes / 60 / weeksSinceCreation
      );
    }
  }

  return {
    totalPlaytimeHours,
    avgWeeklyPlaytimeHours,
    hasRecentActivity,
  };
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

  const appIds = games.map((g) => g.appId);
  const { data: gameInfos, error } = await client
    .from('steam_game_info')
    .select('app_id, genres')
    .in('app_id', appIds);

  if (error) {
    throw new Error(`Failed to fetch game genres: ${error.message}`);
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
 * Play Style 분류
 */
const classifyPlayStyle = (metrics: ActivityMetrics): PlayStyle => {
  const avgWeekly = metrics.avgWeeklyPlaytimeHours;

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
 * steam_user_stats 업데이트
 */
export const updateSteamUserStats = async (
  client: DbClient,
  userId: string,
  accountCreatedAt?: Date
): Promise<void> => {
  console.log(`[UpdateStats] Starting for user ${userId}`);

  // 1. 의미 있는 게임 필터링
  const games = await filterMeaningfulGames(client, userId);
  console.log(`[UpdateStats] Filtered ${games.length} meaningful games`);

  if (games.length === 0) {
    console.log(`[UpdateStats] No games found, skipping stats update`);
    return;
  }

  // 2. 활동 지표 계산
  const activityMetrics = calculateActivityMetrics(games, accountCreatedAt);
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

  // 5. steam_user_stats 업데이트
  const { error } = await steamUserStatsRepository.upsert(client, {
    userId,
    playStyle,
    avgWeeklyPlaytime: activityMetrics.avgWeeklyPlaytimeHours || 0,
    mainGenres: genreProfile.mainGenres,
    activeTimeSlots: [],
  });

  if (error) {
    throw new Error(`Failed to update steam_user_stats: ${error.message}`);
  }

  console.log(`[UpdateStats] Successfully updated steam_user_stats`);
};


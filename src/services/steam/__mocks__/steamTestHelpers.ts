/**
 * Steam 테스트 헬퍼 유틸리티
 *
 * Mock 데이터 생성 및 테스트용 유틸리티 함수 제공
 */

import type { FilteredGame } from '../steamDataFilter.service';
import type { MatchContextCoreDTO } from '@/commons/types/match/matchContextCore.dto';
import type { SteamContextInput } from '@/commons/types/match/matchContextCore.dto';

/**
 * Mock FilteredGame 배열 생성
 *
 * @param count - 생성할 게임 개수
 * @returns FilteredGame 배열
 *
 * @example
 * ```typescript
 * const games = createMockFilteredGames(10);
 * // 10개의 Mock 게임 생성 (짝수는 최근 플레이, 홀수는 누적만)
 * ```
 */
export const createMockFilteredGames = (count: number): FilteredGame[] => {
  return Array.from({ length: count }, (_, i) => ({
    appId: i + 1,
    name: `Game ${i + 1}`,
    playtimeForever: (i + 1) * 100, // 100분, 200분, 300분, ...
    playtimeRecent: i % 2 === 0 ? 60 : null, // 짝수 인덱스만 최근 플레이
    lastPlayed: i % 2 === 0 ? '2026-01-01' : null,
    isRecentlyPlayed: i % 2 === 0,
  }));
};

/**
 * 특정 플레이타임을 가진 Mock FilteredGame 배열 생성
 *
 * @param configs - 게임별 플레이타임 설정
 * @returns FilteredGame 배열
 *
 * @example
 * ```typescript
 * const games = createMockFilteredGamesWithPlaytime([
 *   { forever: 1000, recent: 100 },
 *   { forever: 500, recent: 0 }
 * ]);
 * ```
 */
export const createMockFilteredGamesWithPlaytime = (
  configs: Array<{ forever: number; recent: number }>
): FilteredGame[] => {
  return configs.map((config, i) => ({
    appId: i + 1,
    name: `Game ${i + 1}`,
    playtimeForever: config.forever,
    playtimeRecent: config.recent > 0 ? config.recent : null,
    lastPlayed: config.recent > 0 ? '2026-01-01' : null,
    isRecentlyPlayed: config.recent > 0,
  }));
};

/**
 * Mock MatchContext 생성
 *
 * @param viewerSteam - viewer의 Steam 데이터
 * @param targetSteam - target의 Steam 데이터
 * @returns MatchContextCoreDTO
 *
 * @example
 * ```typescript
 * const context = createMockMatchContext(
 *   { steamGames: [1, 2, 3], mainGenres: ['RPG'], playStyle: 'regular' },
 *   { steamGames: [2, 3, 4], mainGenres: ['Action'], playStyle: 'casual' }
 * );
 * ```
 */
export const createMockMatchContext = (
  viewerSteam?: Partial<SteamContextInput>,
  targetSteam?: Partial<SteamContextInput>
): MatchContextCoreDTO => {
  return {
    viewer: {
      userId: 'viewer-test-id',
      ...(viewerSteam && { steam: viewerSteam as SteamContextInput }),
    },
    target: {
      userId: 'target-test-id',
      ...(targetSteam && { steam: targetSteam as SteamContextInput }),
    },
  };
};

/**
 * Mock Supabase Client 생성 (vitest mock)
 *
 * @param mockData - Mock 데이터
 * @returns Mock Supabase Client
 *
 * @example
 * ```typescript
 * const mockClient = createMockSupabaseClient({
 *   steam_game_info: [
 *     { app_id: 1, name: 'Game 1', genres: ['RPG', 'Action'] }
 *   ]
 * });
 * ```
 */
export const createMockSupabaseClient = (mockData?: {
  steam_game_info?: Array<{
    app_id: number;
    name: string;
    genres: string[];
  }>;
  steam_user_games?: Array<{
    app_id: number;
    playtime_forever: number;
    playtime_recent: number | null;
  }>;
}) => {
  const from = (table: string) => {
    if (table === 'steam_game_info' && mockData?.steam_game_info) {
      return {
        select: () => ({
          in: () => ({
            data: mockData.steam_game_info,
            error: null,
          }),
        }),
      };
    }

    if (table === 'steam_user_games' && mockData?.steam_user_games) {
      return {
        select: () => ({
          eq: () => ({
            data: mockData.steam_user_games,
            error: null,
          }),
        }),
      };
    }

    return {
      select: () => ({
        in: () => ({ data: [], error: null }),
        eq: () => ({ data: [], error: null }),
      }),
    };
  };

  return { from };
};

/**
 * 날짜 유틸: N년 전 날짜 생성
 *
 * @param yearsAgo - 몇 년 전
 * @returns Date 객체
 *
 * @example
 * ```typescript
 * const oneYearAgo = getDateYearsAgo(1);
 * ```
 */
export const getDateYearsAgo = (yearsAgo: number): Date => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - yearsAgo);
  return date;
};

/**
 * 날짜 유틸: N주 전 날짜 생성
 *
 * @param weeksAgo - 몇 주 전
 * @returns Date 객체
 *
 * @example
 * ```typescript
 * const twoWeeksAgo = getDateWeeksAgo(2);
 * ```
 */
export const getDateWeeksAgo = (weeksAgo: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - weeksAgo * 7);
  return date;
};

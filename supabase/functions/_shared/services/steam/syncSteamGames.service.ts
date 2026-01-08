import type { DbClient } from '../../types/dbClient.ts';
import * as userProfilesRepository from '../../repositories/userProfilesRepository.ts';
import * as steamUserGamesRepository from '../../repositories/steamUserGamesRepository.ts';
import * as steamSyncLogRepository from '../../repositories/steamSyncLogRepository.ts';
import * as steamGameRepository from '../../repositories/steamGameRepository.ts';
import * as steamApiClient from './steamApiClient.ts';
import * as steamStoreApiClient from './steamStoreApiClient.ts';

/**
 * syncSteamGames Service
 * 책임: Steam 소유 게임 동기화 오케스트레이션
 */

export type SyncResult = {
  status: 'success' | 'failed' | 'private' | 'not_linked' | 'invalid_steam_id';
  syncedGamesCount: number;
};

/**
 * 64-bit SteamID 형식 검증
 * - 17자리 숫자 문자열
 * - 7656119xxxxxxxx 형식
 */
const isSteamId64 = (id: string): boolean => {
  return /^7656119\d{10}$/.test(id);
};

/**
 * Unix timestamp를 ISO 8601 timestamptz 형식으로 변환
 */
const convertUnixToTimestamptz = (unixTime: number): string => {
  return new Date(unixTime * 1000).toISOString();
};

/**
 * Steam 소유 게임 동기화
 *
 * 책임:
 * - Repository 및 Steam API Client 조합
 * - 실패 케이스를 명시적으로 처리 (throw 금지)
 * - 로그 기록
 *
 * 비책임:
 * - Domain 로직
 * - UI 로직
 * - ViewModel 변환
 *
 * 흐름:
 * 1. user_profiles에서 steam_id 조회
 * 2. steam_id 검증 (없음/형식 오류)
 * 3. Steam API 호출
 * 4. 응답 매핑 및 DB 저장
 * 5. 로그 기록
 * 6. Result 반환
 *
 * @param client - DB 클라이언트
 * @param userId - 인증된 유저 ID
 * @returns SyncResult (throw 없음)
 */
export const syncSteamGames = async (
  client: DbClient,
  userId: string
): Promise<SyncResult> => {
  // 1. user_profiles에서 steam_id 조회
  console.log(`[Sync User ${userId}] Fetching user profile`);
  const profileResult = await userProfilesRepository.findByUserId(
    client,
    userId
  );

  // Repository 에러는 throw (인프라 오류)
  if (profileResult.error) {
    console.error(
      `[Sync User ${userId}] Failed to fetch user profile:`,
      profileResult.error
    );
    throw new Error(
      `Failed to fetch user profile: ${profileResult.error.message}`
    );
  }

  const profile = profileResult.data;

  // 2-1. steam_id 없음
  if (!profile || !profile.steam_id) {
    const result: SyncResult = {
      status: 'not_linked',
      syncedGamesCount: 0,
    };

    // 로그 기록 (실패해도 무시)
    await steamSyncLogRepository.insertLog(client, {
      userId,
      status: 'not_linked',
      syncedGamesCount: 0,
    });

    return result;
  }

  const steamId = profile.steam_id;

  // 2-2. steam_id 형식 검증
  if (!isSteamId64(steamId)) {
    const result: SyncResult = {
      status: 'invalid_steam_id',
      syncedGamesCount: 0,
    };

    // 로그 기록
    await steamSyncLogRepository.insertLog(client, {
      userId,
      status: 'invalid_steam_id',
      syncedGamesCount: 0,
    });

    return result;
  }

  // 3. Steam API 호출
  console.log(
    `[Sync User ${userId}] Calling Steam API with steamId: ${steamId}`
  );
  const apiResult = await steamApiClient.getOwnedGames(steamId);

  if (!apiResult.ok) {
    // 비공개 프로필
    if (apiResult.reason === 'private') {
      console.log(`[Sync User ${userId}] Steam profile is private`);
      const result: SyncResult = {
        status: 'private',
        syncedGamesCount: 0,
      };

      await steamSyncLogRepository.insertLog(client, {
        userId,
        status: 'private',
        syncedGamesCount: 0,
      });

      return result;
    }

    // 네트워크 오류/타임아웃
    console.error(
      `[Sync User ${userId}] Steam API call failed: ${apiResult.reason}`
    );
    const result: SyncResult = {
      status: 'failed',
      syncedGamesCount: 0,
    };

    await steamSyncLogRepository.insertLog(client, {
      userId,
      status: 'failed',
      syncedGamesCount: 0,
    });

    return result;
  }

  const { games: allGames } = apiResult;

  // 4. 게임 필터링: 점진적 검증 (Incremental Validation)
  console.log(
    `[Sync User ${userId}] Starting incremental validation for ${allGames.length} items`
  );

  // 4-1. 캐시 조회 (배치 - 빠름)
  const appIds = allGames.map((g) => g.appid);
  const existingGameIds = await steamGameRepository.checkGameExists(
    client,
    appIds
  );
  const existingSet = new Set(existingGameIds);

  // 4-2. 캐시 히트 게임 분리
  const cachedGames = allGames.filter((g) => existingSet.has(g.appid));
  const uncachedGames = allGames.filter((g) => !existingSet.has(g.appid));

  console.log(
    `[Sync User ${userId}] Cache: ${cachedGames.length} hits, ${uncachedGames.length} misses`
  );

  // 4-3. 캐시 히트 게임 정렬 (최근성 우선)
  const sortedCachedGames = [
    ...cachedGames
      .filter((g) => g.playtime_2weeks && g.playtime_2weeks > 0)
      .sort((a, b) => b.playtime_2weeks! - a.playtime_2weeks!),
    ...cachedGames
      .filter((g) => !g.playtime_2weeks || g.playtime_2weeks === 0)
      .sort((a, b) => b.playtime_forever - a.playtime_forever),
  ];

  // 4-4. 1000개 채우기 위해 필요한 만큼만 미검증 게임 검증
  const TARGET_GAME_COUNT = 1000;
  const validatedGames = [...sortedCachedGames];
  const needed = TARGET_GAME_COUNT - sortedCachedGames.length;

  if (needed > 0 && uncachedGames.length > 0) {
    console.log(
      `[Sync User ${userId}] Need ${needed} more games, validating uncached items...`
    );

    // 미검증 게임도 최근성 기준 정렬
    const sortedUncached = [
      ...uncachedGames
        .filter((g) => g.playtime_2weeks && g.playtime_2weeks > 0)
        .sort((a, b) => b.playtime_2weeks! - a.playtime_2weeks!),
      ...uncachedGames
        .filter((g) => !g.playtime_2weeks || g.playtime_2weeks === 0)
        .sort((a, b) => b.playtime_forever - a.playtime_forever),
    ];

    // 필요한 개수 + 50% 여유분만큼 검증 (일부는 게임이 아닐 수 있음)
    const toValidate = sortedUncached.slice(0, Math.ceil(needed * 1.5));
    let storeApiCallCount = 0;
    let validatedCount = 0;

    for (const game of toValidate) {
      // 충분히 채웠으면 중단
      if (validatedCount >= needed) {
        break;
      }

      storeApiCallCount++;
      const storeResult = await steamStoreApiClient.fetchGameDetails(
        game.appid
      );

      if (storeResult.ok) {
        // 게임이면 steam_game_info에 저장
        try {
          await steamGameRepository.upsertSteamGame(
            client,
            storeResult.gameInfo
          );
          validatedGames.push(game);
          validatedCount++;
        } catch (error) {
          console.error(
            `[Sync User ${userId}] Failed to save game info for app_id ${game.appid}:`,
            error
          );
          // 저장 실패해도 계속 진행
        }
      }
      // storeResult.ok === false면 무시 (게임 아님)

      // Rate limit 방지: 100ms 대기
      if (storeApiCallCount % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `[Sync User ${userId}] Validated ${validatedCount} new games (${storeApiCallCount} Store API calls)`
    );
  }

  // 4-5. 최종 1000개 선택
  const finalGames = validatedGames.slice(0, TARGET_GAME_COUNT);

  console.log(
    `[Sync User ${userId}] Final result: ${finalGames.length} games (from ${allGames.length} total items)`
  );

  // 5. 응답 매핑 (Steam API 형식 → DB 형식)
  const gameInputs: steamUserGamesRepository.SteamUserGameInput[] =
    finalGames.map((game) => ({
      app_id: game.appid,
      name: game.name ?? null,
      playtime_forever: game.playtime_forever,
      playtime_recent: game.playtime_2weeks ?? null,
      last_played: game.rtime_last_played
        ? convertUnixToTimestamptz(game.rtime_last_played)
        : null,
    }));

  // 6. DB 저장 (bulk upsert)
  console.log(
    `[Sync User ${userId}] Upserting ${gameInputs.length} games to DB`
  );
  const upsertResult = await steamUserGamesRepository.bulkUpsert(
    client,
    userId,
    gameInputs
  );

  // Repository 에러는 throw (인프라 오류)
  if (upsertResult.error) {
    console.error(
      `[Sync User ${userId}] Failed to upsert games:`,
      upsertResult.error
    );
    throw new Error(`Failed to upsert games: ${upsertResult.error.message}`);
  }

  const syncedCount = gameInputs.length;

  // 7. 로그 기록 (성공)
  console.log(`[Sync User ${userId}] Successfully synced ${syncedCount} games`);
  await steamSyncLogRepository.insertLog(client, {
    userId,
    status: 'success',
    syncedGamesCount: syncedCount,
  });

  // 8. Result 반환
  return {
    status: 'success',
    syncedGamesCount: syncedCount,
  };
};

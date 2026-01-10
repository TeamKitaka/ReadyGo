import type { DbClient } from '../../types/dbClient.ts';
import { syncSteamGames } from './syncSteamGames.service.ts';

/**
 * batchSyncSteamGames Service
 * 책임: 여러 유저의 Steam 게임 배치 동기화 오케스트레이션
 */

export type BatchSyncResult = {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ userId: string; status: string; error?: string }>;
};

type TargetUser = {
  id: string;
};

/**
 * steam_id가 있는 유저 목록 조회
 * 
 * 우선순위:
 * 1. steam_sync_logs에 기록 없는 유저 (완전히 미동기화)
 * 2. 기록 있는 유저는 제외 (중복 방지)
 *
 * @param client - DB 클라이언트
 * @param limit - 조회할 최대 유저 수 (기본: 100)
 * @returns 유저 목록
 */
const fetchTargetUsers = async (
  client: DbClient,
  limit: number = 100
): Promise<TargetUser[]> => {
  // 1. steam_sync_logs에 기록된 DISTINCT user_id 조회
  const { data: syncLogs, error: syncLogError } = await client
    .from('steam_sync_logs')
    .select('user_id');

  if (syncLogError) {
    console.error('[Batch Sync] Failed to fetch sync logs:', syncLogError);
    throw new Error(`Failed to fetch sync logs: ${syncLogError.message}`);
  }

  // DISTINCT user_id만 추출
  const syncedUserIds = new Set(syncLogs?.map((log) => log.user_id) || []);

  console.log(`[Batch Sync] Already synced users: ${syncedUserIds.size}`);

  // 2. steam_id 있는 모든 유저 조회
  const { data: allUsers, error } = await client
    .from('user_profiles')
    .select('id')
    .not('steam_id', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  if (!allUsers || allUsers.length === 0) {
    return [];
  }

  console.log(`[Batch Sync] Total users with steam_id: ${allUsers.length}`);

  // 3. 미동기화 유저만 선택 (중복 제거)
  const unsyncedUsers = allUsers.filter((u) => !syncedUserIds.has(u.id));

  const targetUsers = unsyncedUsers.slice(0, limit).map((u) => ({ id: u.id }));

  console.log(
    `[Batch Sync] Target users: ${targetUsers.length} (all unsynced)`
  );

  return targetUsers;
};

/**
 * 배치 Steam 게임 동기화
 *
 * 책임:
 * - 동기화 대상 유저 조회
 * - 각 유저별 syncSteamGames 호출
 * - 결과 집계
 *
 * 비책임:
 * - HTTP 요청/응답 처리
 * - Service Role Client 생성
 * - Steam API 호출 (syncSteamGames에서 처리)
 *
 * 흐름:
 * 1. steam_id 있는 유저 목록 조회 (LIMIT 적용)
 * 2. 각 유저별 syncSteamGames 호출
 * 3. 성공/실패 집계
 * 4. 결과 반환
 *
 * @param client - DB 클라이언트
 * @param options - 배치 옵션 (limit)
 * @returns BatchSyncResult (throw 없음, 개별 실패는 계속 진행)
 */
export const batchSyncSteamGames = async (
  client: DbClient,
  options: { limit?: number } = {}
): Promise<BatchSyncResult> => {
  const { limit = 100 } = options;

  // 1. 대상 유저 조회
  const users = await fetchTargetUsers(client, limit);

  const result: BatchSyncResult = {
    total: users.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  if (users.length === 0) {
    console.log('[Batch Sync] No users with steam_id found');
    return result;
  }

  console.log(`[Batch Sync] Starting sync for ${users.length} users`);

  // 2. 각 유저별 동기화 실행
  for (const user of users) {
    try {
      const syncResult = await syncSteamGames(client, user.id);

      if (syncResult.status === 'success') {
        result.success++;
        console.log(
          `[${user.id}] ✓ Success - ${syncResult.syncedGamesCount} games`
        );
      } else {
        result.failed++;
        result.errors.push({
          userId: user.id,
          status: syncResult.status,
        });
        console.log(`[${user.id}] ✗ Failed - ${syncResult.status}`);
      }
    } catch (error) {
      // 예상치 못한 에러 (syncSteamGames는 throw하지 않지만 만약을 위해)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.failed++;
      result.errors.push({
        userId: user.id,
        status: 'unexpected_error',
        error: errorMessage,
      });
      console.error(`[${user.id}] ✗ Unexpected error:`, errorMessage, error);
    }
  }

  console.log(
    `[Batch Sync] Completed - Success: ${result.success}, Failed: ${result.failed}`
  );

  // 3. 결과 반환
  return result;
};

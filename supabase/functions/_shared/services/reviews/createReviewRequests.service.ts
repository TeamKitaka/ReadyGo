import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { Database } from '../../../../types/database.types.ts';

/**
 * Create Review Requests Service (Edge Functions용)
 *
 * 📌 새로운 설계:
 * - game_start_logs = "이 사용자가 이 맥락에서 게임을 시작했다" (개별 참여자의 확정 로그)
 * - 같은 context_id + context_type에서 game_start_logs를 남긴 사용자들만 조회
 * - 그 사용자들끼리 pair 생성 (서로에게 후기)
 *
 * 📌 책임:
 * - 같은 context의 game_start_logs를 조회하여 게임 시작을 한 사용자들 추출
 * - 그 사용자들끼리 서로 pair 생성 (A → B, B → A)
 * - review_requests 생성
 * - UNIQUE constraint로 중복 방지
 *
 * 예시:
 * - 파티에 A, B, C가 있음
 * - A와 B만 게임 시작 버튼을 누름 (game_start_logs 2건)
 * - C는 게임 시작 버튼을 누르지 않음
 * - 결과: A ↔ B만 서로에게 후기 요청 생성 (C는 제외)
 */

export interface CreateReviewRequestsInput {
  contextType: 'chat' | 'party';
  contextId: string; // room_id 또는 post_id (문자열)
}

/**
 * 같은 context에서 game_start_logs를 남긴 사용자들끼리 review_requests를 생성한다
 *
 * @param client - Supabase Admin Client
 * @param input - context 정보
 * @returns 생성된 review_requests 목록
 */
export const createReviewRequests = async (
  client: SupabaseClient<Database>,
  input: CreateReviewRequestsInput
) => {
  // 같은 context의 game_start_logs 조회 (게임 시작을 한 사용자들)
  const { data: gameStartLogs, error: logsError } = await client
    .from('game_start_logs')
    .select('id, actor_id')
    .eq('context_type', input.contextType)
    .eq('context_id', input.contextId);

  if (logsError) {
    console.error(
      `[Create Review Requests] Error fetching game_start_logs:`,
      logsError
    );
    throw logsError;
  }

  if (!gameStartLogs || gameStartLogs.length === 0) {
    console.log(
      `[Create Review Requests] No game_start_logs found for context_type=${input.contextType}, context_id=${input.contextId}`
    );
    return [];
  }

  // 게임 시작을 한 사용자들 추출 (중복 제거)
  const startedUserIds = Array.from(
    new Set(gameStartLogs.map((log) => log.actor_id))
  );

  // 최소 2명 이상이어야 후기 요청 생성 (1명은 의미 없음)
  if (startedUserIds.length < 2) {
    console.log(
      `[Create Review Requests] Not enough users (${startedUserIds.length} < 2) for context_type=${input.contextType}, context_id=${input.contextId}`
    );
    return [];
  }

  // 사용자들끼리 pair 생성 (서로에게 후기)
  // A, B가 있으면: A → B, B → A 생성
  const reviewRequests: Array<{
    game_start_log_id: number;
    context_type: string;
    context_id: number;
    actor_id: string; // 후기를 받을 사람
    target_id: string; // 후기를 써야 하는 사람
    status: 'pending';
  }> = [];

  // context_id를 number로 변환 (game_start_logs의 context_id는 string이지만 review_requests는 number)
  const contextIdNumber = parseInt(input.contextId, 10);
  if (isNaN(contextIdNumber)) {
    console.error(
      `[Create Review Requests] Invalid context_id (cannot convert to number): context_id=${input.contextId}`
    );
    throw new Error(`Invalid context_id: ${input.contextId}`);
  }

  // 각 사용자 쌍에 대해 review_requests 생성
  for (let i = 0; i < startedUserIds.length; i++) {
    for (let j = 0; j < startedUserIds.length; j++) {
      if (i !== j) {
        const actorId = startedUserIds[i]; // 후기를 받을 사람
        const targetId = startedUserIds[j]; // 후기를 써야 하는 사람

        // 해당 사용자의 game_start_log_id 찾기 (첫 번째 것 사용)
        const gameStartLog = gameStartLogs.find(
          (log) => log.actor_id === actorId
        );

        if (gameStartLog) {
          reviewRequests.push({
            game_start_log_id: gameStartLog.id,
            context_type: input.contextType,
            context_id: contextIdNumber,
            actor_id: actorId,
            target_id: targetId,
            status: 'pending',
          });
        }
      }
    }
  }

  if (reviewRequests.length === 0) {
    console.log(
      `[Create Review Requests] No review requests to create for context_type=${input.contextType}, context_id=${input.contextId}`
    );
    return [];
  }

  // INSERT (UNIQUE constraint로 중복 방지)
  const { data, error } = await client
    .from('review_requests')
    .insert(reviewRequests)
    .select();

  if (error) {
    console.error(
      `[Create Review Requests] Error inserting review requests:`,
      error
    );
    throw error;
  }

  console.log(
    `[Create Review Requests] Created ${data?.length || 0} review requests for context_type=${input.contextType}, context_id=${input.contextId}, users=${startedUserIds.length}`
  );

  return data || [];
};

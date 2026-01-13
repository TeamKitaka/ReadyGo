import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { Database } from '../../../../types/database.types.ts';

/**
 * Create Review Requests Service (Edge Functions용)
 *
 * 📌 새로운 설계:
 * - game_start_logs = "이 사용자가 이 맥락에서 게임을 시작했다" (개별 참여자의 확정 로그)
 * - chat: 게임 시작을 누른 사용자들끼리만 후기 요청 생성
 * - party: 파티 멤버 전체에게 후기 요청 생성 (게임 시작을 누른 사람이 1명 이상이면 파티 전체 멤버 대상)
 *
 * 📌 책임:
 * - 같은 context의 game_start_logs를 조회하여 게임 시작을 한 사용자들 추출
 * - party인 경우: party_members에서 파티 멤버 전체 조회
 * - chat인 경우: 게임 시작을 누른 사용자들만 사용
 * - 그 사용자들끼리 서로 pair 생성 (A → B, B → A)
 * - review_requests 생성
 * - UNIQUE constraint로 중복 방지
 *
 * 예시 (party):
 * - 파티에 A, B, C가 있음
 * - A와 B만 게임 시작 버튼을 누름 (game_start_logs 2건)
 * - C는 게임 시작 버튼을 누르지 않음
 * - 결과: A, B, C 모두가 서로에게 후기 요청 생성 (파티 멤버 전체)
 *
 * 예시 (chat):
 * - 채팅방에 A, B가 있음
 * - A와 B 모두 게임 시작 버튼을 누름 (game_start_logs 2건)
 * - 결과: A ↔ B만 서로에게 후기 요청 생성
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
  // context_id는 text 타입이므로 문자열로 정확히 비교
  const normalizedContextId = String(input.contextId).trim();

  console.log(
    `[Create Review Requests] Fetching game_start_logs: context_type=${input.contextType}, context_id="${normalizedContextId}" (type: ${typeof normalizedContextId})`
  );

  const { data: gameStartLogs, error: logsError } = await client
    .from('game_start_logs')
    .select('id, actor_id, context_id, context_type, created_at')
    .eq('context_type', input.contextType)
    .eq('context_id', normalizedContextId);

  if (logsError) {
    console.error(
      `[Create Review Requests] Error fetching game_start_logs:`,
      logsError
    );
    throw logsError;
  }

  // 디버깅: 조회된 레코드 정보 출력
  console.log(
    `[Create Review Requests] Found ${gameStartLogs?.length || 0} game_start_logs:`,
    gameStartLogs?.map((log) => ({
      id: log.id,
      actor_id: log.actor_id,
      context_id: log.context_id,
      context_type: log.context_type,
    }))
  );

  if (!gameStartLogs || gameStartLogs.length === 0) {
    console.log(
      `[Create Review Requests] No game_start_logs found for context_type=${input.contextType}, context_id="${normalizedContextId}"`
    );
    return [];
  }

  // 게임 시작을 한 사용자들 추출 (중복 제거)
  const startedUserIds = Array.from(
    new Set(gameStartLogs.map((log) => log.actor_id))
  );

  console.log(
    `[Create Review Requests] Game started user IDs: ${startedUserIds.length} users`,
    startedUserIds
  );

  // 파티인 경우: 파티 멤버 전체를 대상으로 후기 요청 생성
  // chat인 경우: 게임 시작을 누른 사용자들만 대상
  let targetUserIds: string[];

  if (input.contextType === 'party') {
    // 파티 멤버 전체 조회
    const contextIdNumber = parseInt(normalizedContextId, 10);
    if (isNaN(contextIdNumber)) {
      console.error(
        `[Create Review Requests] Invalid context_id for party (cannot convert to number): context_id=${input.contextId}`
      );
      throw new Error(`Invalid context_id for party: ${input.contextId}`);
    }

    const { data: partyMembers, error: membersError } = await client
      .from('party_members')
      .select('user_id')
      .eq('post_id', contextIdNumber);

    if (membersError) {
      console.error(
        `[Create Review Requests] Error fetching party members:`,
        membersError
      );
      throw membersError;
    }

    if (!partyMembers || partyMembers.length === 0) {
      console.log(
        `[Create Review Requests] No party members found for post_id=${contextIdNumber}`
      );
      return [];
    }

    targetUserIds = Array.from(
      new Set(partyMembers.map((member) => member.user_id).filter(Boolean))
    ) as string[];

    console.log(
      `[Create Review Requests] Party members: ${targetUserIds.length} users`,
      targetUserIds
    );
  } else {
    // chat인 경우: 게임 시작을 누른 사용자들만 사용
    targetUserIds = startedUserIds;
  }

  // 최소 2명 이상이어야 후기 요청 생성 (1명은 의미 없음)
  if (targetUserIds.length < 2) {
    console.log(
      `[Create Review Requests] Not enough users (${targetUserIds.length} < 2) for context_type=${input.contextType}, context_id="${normalizedContextId}"`
    );

    // 디버깅: 왜 1명만 조회되었는지 확인하기 위해 다양한 방식으로 조회
    // 1. 정확한 일치
    console.log(
      `[Create Review Requests] Exact match query result: ${gameStartLogs?.length || 0} logs`
    );

    // 2. 부분 일치 (공백이나 다른 문자가 포함된 경우)
    const { data: similarLogs } = await client
      .from('game_start_logs')
      .select('id, actor_id, context_id, context_type, created_at')
      .eq('context_type', input.contextType)
      .ilike('context_id', `%${normalizedContextId}%`);

    console.log(
      `[Create Review Requests] Similar context_id (ILIKE): ${similarLogs?.length || 0} logs`,
      similarLogs?.map((log) => ({
        id: log.id,
        actor_id: log.actor_id,
        context_id: `"${log.context_id}"`,
        context_id_length: log.context_id?.length,
        created_at: log.created_at,
      }))
    );

    // 3. 숫자로 변환하여 조회 (context_id가 숫자 문자열인 경우)
    const contextIdNum = parseInt(normalizedContextId, 10);
    if (!isNaN(contextIdNum)) {
      const { data: numericLogs } = await client
        .from('game_start_logs')
        .select('id, actor_id, context_id, context_type, created_at')
        .eq('context_type', input.contextType)
        .or(
          `context_id.eq.${contextIdNum},context_id.eq."${contextIdNum}",context_id.eq."${normalizedContextId}"`
        );

      console.log(
        `[Create Review Requests] Numeric context_id variants: ${numericLogs?.length || 0} logs`,
        numericLogs?.map((log) => ({
          id: log.id,
          actor_id: log.actor_id,
          context_id: `"${log.context_id}"`,
        }))
      );
    }

    // 4. 해당 context_type의 모든 최근 로그 조회 (최근 10개)
    const { data: recentLogs } = await client
      .from('game_start_logs')
      .select('id, actor_id, context_id, context_type, created_at')
      .eq('context_type', input.contextType)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(
      `[Create Review Requests] Recent ${input.contextType} logs (last 10):`,
      recentLogs?.map((log) => ({
        id: log.id,
        actor_id: log.actor_id,
        context_id: `"${log.context_id}"`,
        created_at: log.created_at,
      }))
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

  // 파티의 경우: 게임 시작을 누른 사용자가 1명 이상이어야 함
  if (input.contextType === 'party' && startedUserIds.length === 0) {
    console.log(
      `[Create Review Requests] No game started users for party, cannot create review requests`
    );
    return [];
  }

  // 각 사용자 쌍에 대해 review_requests 생성
  for (let i = 0; i < targetUserIds.length; i++) {
    for (let j = 0; j < targetUserIds.length; j++) {
      if (i !== j) {
        const actorId = targetUserIds[i]; // 후기를 받을 사람
        const targetId = targetUserIds[j]; // 후기를 써야 하는 사람

        // 해당 사용자의 game_start_log_id 찾기
        // 파티의 경우: 게임 시작을 누르지 않은 사용자도 포함되므로,
        // 해당 사용자의 로그가 없으면 첫 번째 게임 시작 로그를 사용
        let gameStartLog = gameStartLogs.find(
          (log) => log.actor_id === actorId
        );

        // 게임 시작 로그가 없는 경우 (파티에서 게임 시작을 누르지 않은 사용자)
        // 첫 번째 게임 시작 로그를 사용 (같은 context의 게임이므로)
        if (!gameStartLog && gameStartLogs.length > 0) {
          gameStartLog = gameStartLogs[0];
          console.log(
            `[Create Review Requests] User ${actorId} did not start game, using first game_start_log_id: ${gameStartLog.id}`
          );
        }

        if (gameStartLog) {
          const reviewRequest = {
            game_start_log_id: gameStartLog.id,
            context_type: input.contextType,
            context_id: contextIdNumber,
            actor_id: actorId,
            target_id: targetId,
            status: 'pending' as const,
          };

          console.log(
            `[Create Review Requests] Adding review request: context_type=${reviewRequest.context_type}, context_id=${reviewRequest.context_id}, actor_id=${reviewRequest.actor_id}, target_id=${reviewRequest.target_id}`
          );

          reviewRequests.push(reviewRequest);
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

  // 중복 방지: 같은 context에서 이미 pending 상태인 review_request가 있는지 확인
  // - party: 같은 party_post_id (context_id)에서 중복 방지
  // - chat: 같은 chat_room_id (context_id)에서 중복 방지
  // 같은 파티/채팅방에서 여러 번 게임을 시작해도 중복 알림이 가지 않도록
  const existingRequests = await client
    .from('review_requests')
    .select('actor_id, target_id')
    .eq('context_type', input.contextType)
    .eq('context_id', contextIdNumber) // party: post_id, chat: room_id
    .eq('status', 'pending');

  if (existingRequests.error) {
    console.error(
      `[Create Review Requests] Error checking existing requests:`,
      existingRequests.error
    );
    // 에러가 발생해도 계속 진행 (UNIQUE constraint가 최종 방어선)
  }

  // 이미 존재하는 (actor_id, target_id) 조합 제외
  const existingPairs = new Set(
    (existingRequests.data || []).map(
      (req) => `${req.actor_id}:${req.target_id}`
    )
  );

  const filteredReviewRequests = reviewRequests.filter(
    (req) => !existingPairs.has(`${req.actor_id}:${req.target_id}`)
  );

  if (filteredReviewRequests.length === 0) {
    console.log(
      `[Create Review Requests] All review requests already exist for context_type=${input.contextType}, context_id=${input.contextId}`
    );
    return [];
  }

  console.log(
    `[Create Review Requests] Filtered: ${filteredReviewRequests.length} new requests (${reviewRequests.length - filteredReviewRequests.length} duplicates skipped)`
  );

  // INSERT (UNIQUE constraint로 중복 방지)
  const { data, error } = await client
    .from('review_requests')
    .insert(filteredReviewRequests)
    .select();

  if (error) {
    console.error(
      `[Create Review Requests] Error inserting review requests:`,
      error
    );
    throw error;
  }

  console.log(
    `[Create Review Requests] Created ${data?.length || 0} review requests for context_type=${input.contextType}, context_id=${input.contextId}, target_users=${targetUserIds.length}, game_started_users=${startedUserIds.length}`
  );

  return data || [];
};

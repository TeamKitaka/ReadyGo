import * as notificationsRepository from '@/repositories/notifications.repository';

/**
 * Game Started Notification Service
 *
 * 📌 책임:
 * - "게임 시작 알림"의 의미만 정의
 * - actor(sender) / receiver 관계 정의
 * - entity 연결 (chat_room 또는 party_post)
 * - Repository 호출만 수행
 *
 * ❌ 하면 안 되는 것:
 * - SupabaseClient 생성
 * - auth.uid() 접근
 * - HTTP 요청
 * - RLS, service_role, Edge Function 고려
 */

export interface GameStartedNotificationInput {
  receiverIds: string[]; // 알림 받을 사람들 (message sender 제외)
  actorId: string; // 게임 시작을 누른 사람
  contextType: 'chat' | 'party';
  contextId: string; // room_id 또는 post_id
}

/**
 * 게임 시작 알림을 생성한다
 *
 * @param input - 게임 시작 정보
 * @returns Repository 응답 그대로 반환 (에러 처리 없음)
 */
export const createGameStartedNotification = async (
  input: GameStartedNotificationInput
) => {
  // entity_type 매핑: 'chat' → 'chat_room', 'party' → 'party_post'
  const entityType =
    input.contextType === 'chat' ? 'chat_room' : 'party_post';

  return await notificationsRepository.bulkInsert(input.receiverIds, {
    type: 'GAME_STARTED',
    actor_id: input.actorId,
    entity_type: entityType,
    entity_id: input.contextId, // room_id 또는 post_id (문자열)
  });
};


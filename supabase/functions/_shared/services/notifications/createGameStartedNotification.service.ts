import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import * as notificationsRepository from '../../repositories/notifications.repository.ts';

/**
 * Game Started Notification Service (Edge Functions용)
 *
 * 📌 책임:
 * - "게임 시작 알림"의 의미만 정의
 * - actor(sender) / receiver 관계 정의
 * - entity 연결 (chat_room 또는 party_post)
 * - Repository 호출만 수행
 *
 * ❌ 하면 안 되는 것:
 * - 언제 호출되는지 판단
 * - DB Trigger 존재 가정
 * - 비즈니스 로직 판단
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
 * @param client - Supabase Admin Client
 * @param input - 게임 시작 정보
 * @returns Repository 응답 그대로 반환 (에러 처리 없음)
 */
export const createGameStartedNotification = async (
  client: SupabaseClient,
  input: GameStartedNotificationInput
) => {
  // entity_type 매핑: 'chat' → 'chat_room', 'party' → 'party_post'
  const entityType = input.contextType === 'chat' ? 'chat_room' : 'party_post';

  return await notificationsRepository.bulkInsert(client, input.receiverIds, {
    type: 'GAME_STARTED',
    actor_id: input.actorId,
    entity_type: entityType,
    entity_id: input.contextId, // room_id 또는 post_id (문자열)
  });
};

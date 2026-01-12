import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import * as notificationsRepository from '../../repositories/notifications.repository.ts';

/**
 * Friend Request Notification Service (Edge Functions용)
 *
 * 📌 책임:
 * - "친구 요청 알림"의 의미만 정의
 * - actor(sender) / receiver 관계 정의
 * - entity 연결 (friend_request)
 * - Repository 호출만 수행
 *
 * ❌ 하면 안 되는 것:
 * - 언제 호출되는지 판단
 * - DB Trigger 존재 가정
 * - 비즈니스 로직 판단
 */

export interface FriendRequestNotificationInput {
  requestId: number; // friend_requests.id
  senderId: string; // 친구 요청 보낸 유저
  receiverId: string; // 알림 수신 유저
}

/**
 * 친구 요청 알림을 생성한다
 *
 * @param client - Supabase Admin Client
 * @param input - 친구 요청 정보
 * @returns Repository 응답 그대로 반환 (에러 처리 없음)
 */
export const createFriendRequestNotification = async (
  client: SupabaseClient,
  input: FriendRequestNotificationInput
) => {
  return await notificationsRepository.insert(client, {
    user_id: input.receiverId, // 알림을 받는 사람
    type: 'FRIEND_REQUESTED',
    actor_id: input.senderId, // 친구 요청을 보낸 사람
    entity_type: 'friend_request',
    entity_id: String(input.requestId), // number → string 변환
  });
};

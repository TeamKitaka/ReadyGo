import * as notificationsRepository from '@/repositories/notifications.repository';

/**
 * Friend Accepted Notification Service
 *
 * 📌 책임:
 * - "친구 요청 수락 알림"의 의미만 정의
 * - actor(receiver) / receiver(sender) 관계 정의
 * - entity 연결 (friend_request)
 * - Repository 호출만 수행
 *
 * ❌ 하면 안 되는 것:
 * - SupabaseClient 생성
 * - auth.uid() 접근
 * - HTTP 요청
 * - RLS, service_role, Edge Function 고려
 */

export interface FriendAcceptedNotificationInput {
  requestId: number; // friend_requests.id
  receiverId: string; // 알림 받을 사람 (원래 sender, 요청을 보낸 사람)
  actorId: string; // 수락한 사람 (원래 receiver)
}

/**
 * 친구 요청 수락 알림을 생성한다
 *
 * @param input - 친구 요청 수락 정보
 * @returns Repository 응답 그대로 반환 (에러 처리 없음)
 */
export const createFriendAcceptedNotification = async (
  input: FriendAcceptedNotificationInput
) => {
  return await notificationsRepository.insert({
    user_id: input.receiverId, // 알림을 받는 사람 (원래 sender)
    type: 'FRIEND_ACCEPTED',
    actor_id: input.actorId, // 친구 요청을 수락한 사람 (원래 receiver)
    entity_type: 'friend_request',
    entity_id: String(input.requestId), // number → string 변환
  });
};

import * as notificationsRepository from '@/repositories/notifications.repository';

/**
 * Friend Request Notification Service
 * 
 * 📌 책임:
 * - "친구 요청 알림"의 의미만 정의
 * - actor(sender) / receiver 관계 정의
 * - entity 연결 (friend_request)
 * - Repository 호출만 수행
 * 
 * ❌ 하면 안 되는 것:
 * - SupabaseClient 생성
 * - auth.uid() 접근
 * - HTTP 요청
 * - RLS, service_role, Edge Function 고려
 */

export interface FriendRequestNotificationInput {
  requestId: number; // friend_requests.id
  senderId: string; // 친구 요청 보낸 유저
  receiverId: string; // 알림 수신 유저
}

/**
 * 친구 요청 알림을 생성한다
 * 
 * @param input - 친구 요청 정보
 * @returns Repository 응답 그대로 반환 (에러 처리 없음)
 */
export const createFriendRequestNotification = async (
  input: FriendRequestNotificationInput
) => {
  return await notificationsRepository.insert({
    user_id: input.receiverId, // 알림을 받는 사람
    type: 'FRIEND_REQUESTED',
    actor_id: input.senderId, // 친구 요청을 보낸 사람
    entity_type: 'friend_request',
    entity_id: String(input.requestId), // number → string 변환
  });
};


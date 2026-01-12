/**
 * Notification Types
 *
 * ⚠️ 중요: src/types/notification.ts와 항상 동기화 필요
 * 새로운 알림 타입 추가 시 양쪽 파일 모두 업데이트해야 함
 */

export type NotificationType =
  | 'FRIEND_REQUESTED'
  | 'CHAT_RECEIVED'
  | 'REVIEW_REQUESTED'
  | 'REVIEW_RECEIVED'
  | 'GAME_STARTED';

export type NotificationEntityType =
  | 'chat_room'
  | 'party_post'
  | 'friend_request'
  | 'review'
  | 'game_start';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id?: string;
  entity_type?: NotificationEntityType;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

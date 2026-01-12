export type NotificationType =
  | 'FRIEND_REQUESTED'
  | 'FRIEND_ACCEPTED'
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

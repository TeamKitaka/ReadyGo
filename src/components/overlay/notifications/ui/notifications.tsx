'use client';

import Icon, { type IconName } from '@/commons/components/icon';
import styles from './styles.module.css';
import type { NotificationType as DBNotificationType } from '@/types/notification';
import type { NotificationWithActor } from '@/hooks/useNotifications';

// Re-export for convenience
export type { NotificationWithActor } from '@/hooks/useNotifications';

// 알림 타입 정의 (DB 타입과 매핑)
export type NotificationType = DBNotificationType;

// 알림 아이템 인터페이스
export interface NotificationItem {
  id: string;
  type: NotificationType;
  nickname: string;
  timestamp: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  onClick?: () => void;
}

// 시간 포맷팅 함수
const formatNotificationTime = (dateString: string | null): string => {
  if (!dateString) {
    return '';
  }

  const notificationDate = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - notificationDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return '방금 전';
  }
  if (diffMins < 60) {
    return `${diffMins}분 전`;
  }
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }
  if (diffDays < 7) {
    return `${diffDays}일 전`;
  }

  const month = notificationDate.getMonth() + 1;
  const day = notificationDate.getDate();
  return `${month}월 ${day}일`;
};

// DB 데이터를 NotificationItem으로 변환
const convertToNotificationItem = (
  notification: NotificationWithActor
): NotificationItem => {
  const nickname = notification.actor_profile?.nickname || '알 수 없음';
  const timestamp = formatNotificationTime(notification.created_at);

  return {
    id: String(notification.id),
    type: notification.type as NotificationType,
    nickname,
    timestamp,
    isRead: notification.is_read || false,
    entityType: notification.entity_type || undefined,
    entityId: notification.entity_id || undefined,
  };
};

// 알림 리스트 Props
interface NotificationsProps {
  notifications: NotificationItem[];
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (notification: NotificationItem) => void;
  loading?: boolean;
}

// 알림 타입별 메시지 생성
const getNotificationMessage = (
  type: NotificationType,
  nickname: string
): string => {
  switch (type) {
    case 'REVIEW_RECEIVED':
      return `${nickname}님이 후기를 보냄`;
    case 'REVIEW_REQUESTED':
      return `${nickname}님과의 게임은 어떠셨나요?`;
    case 'FRIEND_REQUESTED':
      return `${nickname}님이 친구 요청을 보냄`;
    case 'FRIEND_ACCEPTED':
      return `${nickname}님이 친구 요청을 수락했습니다`;
    case 'CHAT_RECEIVED':
      return `${nickname}님이 메시지를 보냄`;
    case 'GAME_STARTED':
      return `${nickname}님과 게임이 시작되었습니다`;
    case 'PARTY_INVITED':
      return `${nickname}님이 파티에 초대함`;
    default:
      return '';
  }
};

// 알림 타입별 아이콘 이름
const getNotificationIcon = (type: NotificationType): IconName => {
  switch (type) {
    case 'REVIEW_RECEIVED':
      return 'mail-open';
    case 'REVIEW_REQUESTED':
      return 'review';
    case 'FRIEND_REQUESTED':
      return 'add-user';
    case 'FRIEND_ACCEPTED':
      return 'check';
    case 'CHAT_RECEIVED':
      return 'message-circle-dots';
    case 'GAME_STARTED':
      return 'play-circle';
    case 'PARTY_INVITED':
      return 'gamepad';
    default:
      return 'notification';
  }
};

// 알림 타입별 색상 클래스
const getNotificationColorClass = (type: NotificationType): string => {
  switch (type) {
    case 'REVIEW_RECEIVED':
      return styles.reviewReceived;
    case 'REVIEW_REQUESTED':
      return styles.reviewRequested;
    case 'FRIEND_REQUESTED':
      return styles.friendRequested;
    case 'FRIEND_ACCEPTED':
      return styles.friendRequested; // 친구 수락도 같은 색상 사용
    case 'CHAT_RECEIVED':
      return styles.chatReceived;
    case 'GAME_STARTED':
      return styles.partyInvited; // 게임 시작도 파티와 같은 색상 사용
    case 'PARTY_INVITED':
      return styles.partyInvited;
    default:
      return '';
  }
};

// 단일 알림 아이템 컴포넌트
const NotificationItemComponent = ({
  notification,
  onClick,
}: {
  notification: NotificationItem;
  onClick?: () => void;
}) => {
  const message = getNotificationMessage(
    notification.type,
    notification.nickname
  );
  const iconName = getNotificationIcon(notification.type);
  const colorClass = getNotificationColorClass(notification.type);

  return (
    <button
      className={`${styles.notificationItem} ${notification.isRead ? styles.read : styles.unread}`}
      onClick={onClick}
      type="button"
    >
      <div className={styles.notificationContent}>
        <div className={`${styles.iconContainer} ${colorClass}`}>
          <Icon name={iconName} size={20} className={styles.icon} />
        </div>
        <div className={styles.textContainer}>
          <div className={styles.message}>{message}</div>
          <div className={styles.timestamp}>{notification.timestamp}</div>
        </div>
      </div>
      {!notification.isRead && <div className={styles.unreadDot} />}
    </button>
  );
};

// 메인 알림 컴포넌트
export default function Notifications({
  notifications,
  onMarkAllAsRead,
  onNotificationClick,
  loading = false,
}: NotificationsProps) {
  const handleNotificationClick = (notification: NotificationItem) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    if (notification.onClick) {
      notification.onClick();
    }
  };

  return (
    <div className={styles.notificationsContainer}>
      {/* 헤더 */}
      <div className={styles.header}>
        <h2 className={styles.title}>알림 수신함</h2>
        {onMarkAllAsRead && (
          <button
            className={styles.markAllReadButton}
            onClick={onMarkAllAsRead}
            type="button"
            disabled={loading || notifications.length === 0}
          >
            모두 읽음
          </button>
        )}
      </div>

      {/* 알림 리스트 */}
      <div className={styles.notificationsList}>
        {loading ? (
          <div className={styles.emptyState}>로딩 중...</div>
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>알림이 없습니다</div>
        ) : (
          notifications.map((notification) => (
            <NotificationItemComponent
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// export helper function
export { convertToNotificationItem, formatNotificationTime };

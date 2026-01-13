'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OverlayContainer from '@/commons/components/overlay';
import Notifications from '@/components/overlay/notifications/ui';
import { convertToNotificationItem } from '@/components/overlay/notifications/ui';
import { FriendsContainer } from '@/components/overlay/friends';
import { useNotifications } from '@/hooks/useNotifications';
import { useOverlayStore } from '@/stores/overlay.store';
import { getChatRoomUrl, getPartyDetailUrl } from '@/commons/constants/url';

interface LayoutOverlaysProps {
  currentOverlay: string | null;
  onClose: () => void;
}

export const LayoutOverlays = ({
  currentOverlay,
  onClose,
}: LayoutOverlaysProps) => {
  const router = useRouter();
  const { openFriends } = useOverlayStore();
  const { notifications, loading, markAsRead } = useNotifications();
  const [friendsInitialTab, setFriendsInitialTab] = useState<
    'list' | 'request'
  >('list');
  const [shouldResetFriendsTab, setShouldResetFriendsTab] = useState(false);

  // friends overlay가 닫혔다가 다시 열릴 때 초기 탭 리셋
  useEffect(() => {
    if (currentOverlay === 'friends') {
      if (shouldResetFriendsTab) {
        setFriendsInitialTab('list');
        setShouldResetFriendsTab(false);
      }
    } else if (
      currentOverlay !== 'friends' &&
      friendsInitialTab === 'request'
    ) {
      // friends overlay가 닫히면 다음에 열릴 때 리셋하도록 플래그 설정
      setShouldResetFriendsTab(true);
    }
  }, [currentOverlay, friendsInitialTab, shouldResetFriendsTab]);

  const handleNotificationClick = (notification: {
    id: string;
    type: string;
    entityType?: string;
    entityId?: string;
    onClick?: () => void;
  }) => {
    // 알림 읽음 처리
    markAsRead(Number(notification.id));

    // 친구 요청 알림: friends overlay를 열고 친구 요청 탭 활성화
    if (notification.type === 'FRIEND_REQUESTED') {
      setFriendsInitialTab('request');
      setShouldResetFriendsTab(false); // 알림에서 온 경우 리셋하지 않음
      // openFriends()를 호출하면 currentOverlay가 'friends'로 변경되므로
      // notifications overlay는 자동으로 닫히고 friends overlay가 열림
      openFriends();
      return;
    }

    // 친구 수락 알림: friends overlay를 열고 친구 목록 탭 활성화
    if (notification.type === 'FRIEND_ACCEPTED') {
      setFriendsInitialTab('list');
      setShouldResetFriendsTab(false); // 알림에서 온 경우 리셋하지 않음
      openFriends();
      return;
    }

    // 게임 시작 알림: chat_room 또는 party_post로 이동
    if (notification.type === 'GAME_STARTED') {
      if (notification.entityType === 'chat_room' && notification.entityId) {
        // 채팅방으로 이동
        router.push(getChatRoomUrl(notification.entityId));
        onClose(); // 알림 overlay 닫기
        return;
      } else if (
        notification.entityType === 'party_post' &&
        notification.entityId
      ) {
        // 파티 상세 페이지로 이동
        router.push(getPartyDetailUrl(notification.entityId));
        onClose(); // 알림 overlay 닫기
        return;
      }
    }

    // TODO: 다른 entity_type들 처리
    // - review: 후기 페이지로 이동

    if (notification.onClick) {
      notification.onClick();
    }
  };

  const handleMarkAllAsRead = () => {
    // is_read가 false인 알림만 읽음 처리
    markAsRead();
  };

  if (currentOverlay === 'notifications') {
    const notificationItems = (notifications || []).map(
      convertToNotificationItem
    );

    return (
      <OverlayContainer onClose={onClose}>
        <Notifications
          notifications={notificationItems}
          loading={loading}
          onMarkAllAsRead={handleMarkAllAsRead}
          onNotificationClick={handleNotificationClick}
        />
      </OverlayContainer>
    );
  }

  if (currentOverlay === 'friends') {
    return (
      <OverlayContainer onClose={onClose}>
        <FriendsContainer initialTab={friendsInitialTab} />
      </OverlayContainer>
    );
  }

  return null;
};

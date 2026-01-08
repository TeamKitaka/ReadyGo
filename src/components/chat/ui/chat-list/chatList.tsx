'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Avatar from '@/commons/components/avatar';
import { getChatRoomUrl } from '@/commons/constants/url';
import styles from './styles.module.css';
import {
  useChatList,
  type FormattedChatRoomItem,
} from '@/components/chat/hooks';

interface ChatListItemProps {
  item: FormattedChatRoomItem;
  isSelected?: boolean;
  onClick?: () => void;
  onRoomClick?: (roomId: number) => void;
}

const ChatListItem = ({
  item,
  isSelected = false,
  onClick,
  onRoomClick,
}: ChatListItemProps) => {
  const {
    roomId,
    roomName,
    avatarImagePath,
    userStatus,
    messageContent,
    messageTime,
    unreadCount,
  } = item;
  const router = useRouter();

  const itemClasses = [styles.chatItem, isSelected && styles.selected]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    if (roomId) {
      if (onRoomClick) {
        onRoomClick(roomId);
      }
      router.push(getChatRoomUrl(String(roomId)));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={itemClasses}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${roomName} 채팅방, ${unreadCount > 0 ? `읽지 않은 메시지 ${unreadCount}개` : '읽음'}`}
    >
      <div className={styles.chatItemContent}>
        <div className={styles.avatarWrapper}>
          <Avatar
            imageUrl={avatarImagePath}
            alt={roomName}
            size="s"
            status={userStatus}
            showStatus={true}
          />
        </div>

        <div className={styles.textBlock}>
          <div className={styles.nameRow}>
            <span
              className={`${styles.roomName} ${unreadCount > 0 ? styles.unread : ''}`}
            >
              {roomName}
            </span>
          </div>
          <div className={styles.messageRow}>
            <span className={styles.lastMessage}>{messageContent}</span>
          </div>
        </div>
      </div>

      <div className={styles.metaBlock}>
        <div className={styles.timeRow}>
          <span className={styles.messageTime}>{messageTime}</span>
        </div>
        {unreadCount > 0 && (
          <div className={styles.badgeRow}>
            <div
              className={styles.unreadBadge}
              aria-label={`읽지 않은 메시지 ${unreadCount}개`}
            >
              <span>{unreadCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ChatList() {
  const pathname = usePathname();
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const { formattedChatRooms, isLoading, error, markRoomAsReadOptimistic } =
    useChatList({
      autoRefresh: true,
      refreshInterval: 30000,
    });

  // URL에서 현재 roomId 추출하여 선택 상태 초기화
  useEffect(() => {
    // pathname이 /chat/[roomId] 형식인지 확인
    const chatRoomMatch = pathname?.match(/^\/chat\/(\d+)$/);
    if (chatRoomMatch) {
      const roomIdFromUrl = parseInt(chatRoomMatch[1], 10);
      if (!isNaN(roomIdFromUrl)) {
        setSelectedRoomId(roomIdFromUrl);
      }
    } else {
      // 채팅방이 선택되지 않은 경우 선택 상태 초기화
      setSelectedRoomId(null);
    }
  }, [pathname]);

  // 에러 상태 처리
  if (error) {
    console.error('ChatList error:', error);
  }

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>메시지</h1>
        </div>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>로딩 중...</p>
        </div>
      </div>
    );
  }

  // 빈 상태 처리
  if (formattedChatRooms.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>메시지</h1>
        </div>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>채팅방이 없습니다</p>
        </div>
      </div>
    );
  }

  const handleRoomClick = async (roomId: number) => {
    // 낙관적 업데이트 (UI 즉시 반영)
    markRoomAsReadOptimistic(roomId);
    setSelectedRoomId(roomId);

    // DB에 읽음 처리 (백그라운드에서 처리)
    try {
      const response = await fetch('/api/chat/message/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          roomId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          'Failed to mark room as read:',
          errorData.error || '읽음 처리에 실패했습니다.',
          'Status:',
          response.status,
          'Response:',
          errorData
        );
        // 에러 발생 시 낙관적 업데이트 롤백하지 않음 (사용자 경험 우선)
      } else {
        await response.json().catch(() => ({}));
      }
    } catch (error) {
      // 에러 발생 시 낙관적 업데이트 롤백하지 않음 (사용자 경험 우선)
      void error;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>메시지</h1>
      </div>

      <div className={styles.listWrapper}>
        {formattedChatRooms.map((item) => (
          <ChatListItem
            key={item.roomId}
            item={item}
            isSelected={selectedRoomId === item.roomId}
            onClick={() => setSelectedRoomId(item.roomId)}
            onRoomClick={handleRoomClick}
          />
        ))}
      </div>
    </div>
  );
}

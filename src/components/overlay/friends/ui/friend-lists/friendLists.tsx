'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './styles.module.css';
import Avatar from '@/commons/components/avatar';
import Icon from '@/commons/components/icon';
import { useFriendList } from '@/hooks/useFriendList';
import { useChatList } from '@/components/chat/hooks';
import { useAuthStore } from '@/stores/auth.store';
import { getEffectiveStatus } from '@/stores/user-status.store';
import { getAvatarImagePath } from '@/lib/avatar/getAvatarImagePath';
import { usePresenceStore } from '@/stores/presence.store';

export default function FriendLists() {
  const router = useRouter();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const { friends, loading, error } = useFriendList();
  const { chatRooms } = useChatList();
  const myUserId = useAuthStore((state) => state.user?.id);
  // presence 상태 변경 시 리렌더링되도록 구독
  usePresenceStore((state) => state.presenceUserIds);

  const handleMessage = async (userId: string) => {
    if (!myUserId || !userId || isCreatingChat) {
      return;
    }

    try {
      setIsCreatingChat(true);

      // 먼저 기존 채팅방이 있는지 확인
      const existingRoom = chatRooms.find((room) => {
        // 다른 멤버의 user_id가 현재 userId와 일치하는지 확인
        return room.otherMember?.id === userId && room.room.type === 'direct';
      });

      if (existingRoom && existingRoom.room.id) {
        // 기존 채팅방이 있으면 해당 채팅방으로 이동
        router.push(`/chat/${existingRoom.room.id}`);
        return;
      }

      // 기존 채팅방이 없으면 새로 생성
      const response = await fetch('/api/chat/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberIds: [myUserId, userId],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[FriendLists] Failed to create chat room:', errorData);
        alert('채팅방 생성에 실패했습니다.');
        return;
      }

      const { data: newRoom } = await response.json();

      // 채팅 페이지로 이동
      router.push(`/chat/${newRoom.id}`);
    } catch (error) {
      console.error('[FriendLists] Error creating chat room:', error);
      alert('채팅방 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleMore = (userId: string) => {
    // TODO: Implement more options functionality
    void userId;
  };

  // 상태 텍스트 변환 함수
  const getStatusText = (
    status: 'online' | 'offline' | 'away' | 'dnd'
  ): string => {
    switch (status) {
      case 'online':
        return '온라인';
      case 'offline':
        return '오프라인';
      case 'away':
        return '자리비움';
      case 'dnd':
        return '방해금지';
      default:
        return '오프라인';
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.listContainer}>
            <p>로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.listContainer}>
            <p>오류가 발생했습니다: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // 친구가 없는 경우
  if (friends.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.listContainer}>
            <p>친구가 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Content */}
      <div className={styles.content}>
        {/* Friend List */}
        <div className={styles.listContainer}>
          {friends.map((friend) => {
            const nickname = friend.profile?.nickname || '알 수 없음';
            // presence 기반 상태 계산
            const effectiveStatus = getEffectiveStatus(friend.user_id);
            // 아바타 이미지 경로 계산
            const avatarImagePath = getAvatarImagePath(
              friend.profile?.avatar_url,
              friend.profile?.animal_type
            );

            return (
              <div key={friend.user_id} className={styles.friendItem}>
                <div className={styles.userInfo}>
                  <div className={styles.avatarWrapper}>
                    <Avatar
                      size="s"
                      imageUrl={avatarImagePath}
                      status={effectiveStatus}
                      showStatus={true}
                    />
                  </div>
                  <div className={styles.textInfo}>
                    <div className={styles.nicknameContainer}>
                      <p className={styles.nickname}>{nickname}</p>
                    </div>
                    <div className={styles.statusContainer}>
                      <p className={styles.statusText}>
                        {getStatusText(effectiveStatus)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleMessage(friend.user_id)}
                    aria-label="메시지 보내기"
                  >
                    <Icon name="message-circle-dots" size={20} />
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleMore(friend.user_id)}
                    aria-label="더보기"
                  >
                    <div className={styles.moreIcon}>
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import styles from './styles.module.css';
import Avatar from '@/commons/components/avatar';
import Icon from '@/commons/components/icon';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useFriendActions } from '@/hooks/useFriendActions';
import { getAvatarImagePath } from '@/lib/avatar/getAvatarImagePath';

export default function FriendRequests() {
  const {
    requests: initialRequests,
    loading,
    error,
    refetch,
  } = useFriendRequests();
  const { acceptRequest, rejectRequest, isLoading } = useFriendActions();

  // 처리 중인 요청 ID를 추적하여 목록에서 제거
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  // 처리 중인 요청을 제외한 목록
  const requests = initialRequests.filter((req) => !processingIds.has(req.id));

  const handleAccept = async (requestId: number) => {
    // Optimistic update: 즉시 목록에서 제거
    setProcessingIds((prev) => new Set(prev).add(requestId));

    const success = await acceptRequest(requestId);
    if (success) {
      // 성공 시 목록 새로고침 (캐시 무시)
      // 약간의 지연을 두어 서버 상태가 반영되도록 함
      setTimeout(() => {
        refetch();
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }, 300);
    } else {
      // 실패 시 다시 목록에 표시
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleReject = async (requestId: number) => {
    // Optimistic update: 즉시 목록에서 제거
    setProcessingIds((prev) => new Set(prev).add(requestId));

    const success = await rejectRequest(requestId);
    if (success) {
      // 성공 시 목록 새로고침 (캐시 무시)
      // 약간의 지연을 두어 서버 상태가 반영되도록 함
      setTimeout(() => {
        refetch();
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }, 300);
    } else {
      // 실패 시 다시 목록에 표시
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
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

  // 요청이 없는 경우
  if (requests.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.listContainer}>
            <p>받은 친구 요청이 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Content */}
      <div className={styles.content}>
        {/* Friend Request List */}
        <div className={styles.listContainer}>
          {requests.map((request) => {
            const senderProfile = request.sender_profile;
            const nickname = senderProfile?.nickname || '알 수 없음';
            // user_status는 별도로 조회하지 않으므로 기본값 사용
            const status: 'online' | 'offline' | 'away' | 'dnd' = 'offline';
            // 아바타 이미지 경로 계산
            const avatarImagePath = getAvatarImagePath(
              senderProfile?.avatar_url,
              senderProfile?.animal_type
            );

            return (
              <div key={request.id} className={styles.requestItem}>
                <div className={styles.userInfo}>
                  <div className={styles.avatarWrapper}>
                    <Avatar
                      size="s"
                      imageUrl={avatarImagePath}
                      status={status}
                      showStatus={false}
                    />
                  </div>
                  <div className={styles.textInfo}>
                    <div className={styles.nicknameContainer}>
                      <p className={styles.nickname}>{nickname}</p>
                    </div>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleAccept(request.id)}
                    aria-label="수락"
                    disabled={isLoading}
                  >
                    <Icon name="check" size={20} />
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.rejectButton}`}
                    onClick={() => handleReject(request.id)}
                    aria-label="거절"
                    disabled={isLoading}
                  >
                    <Icon name="x" size={20} />
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

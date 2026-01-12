'use client';

import { useState, useEffect } from 'react';
import { useFriendList } from './useFriendList';
import { useFriendRequests } from './useFriendRequests';

export type FriendStatus = 'friend' | 'pending' | 'none' | null;

/**
 * 친구 상태 확인 훅
 * 특정 사용자와의 친구 관계 상태를 확인
 */
export const useFriendStatus = (targetUserId: string | null) => {
  const [status, setStatus] = useState<FriendStatus>(null);
  const [loading, setLoading] = useState(false);
  const { friends } = useFriendList();
  const { requests } = useFriendRequests();

  useEffect(() => {
    if (!targetUserId) {
      setStatus(null);
      return;
    }

    setLoading(true);

    try {
      // 1. 친구 목록에서 확인
      const isFriend = friends.some(
        (friend) => friend.user_id === targetUserId
      );

      if (isFriend) {
        setStatus('friend');
        setLoading(false);
        return;
      }

      // 2. pending 요청 확인
      // 내가 받은 요청 중에서 sender가 targetUserId인 경우
      const hasReceivedRequest = requests.some(
        (req) => req.sender_id === targetUserId
      );

      // 내가 보낸 요청 확인 (별도 API 필요하지만, 일단 받은 요청만 체크)
      // TODO: 내가 보낸 요청도 확인하려면 별도 API 필요
      if (hasReceivedRequest) {
        setStatus('pending');
      } else {
        setStatus('none');
      }
    } catch (error) {
      console.error('[useFriendStatus] Error:', error);
      setStatus('none');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, friends, requests]);

  return { status, loading };
};

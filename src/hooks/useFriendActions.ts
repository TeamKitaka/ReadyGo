'use client';

import { useState } from 'react';

/**
 * 친구 액션 훅
 * 친구 요청 수락/거절 기능 제공
 */
export const useFriendActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptRequest = async (requestId: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_id: requestId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '친구 요청 수락에 실패했습니다.');
      }

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const rejectRequest = async (requestId: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_id: requestId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '친구 요청 거절에 실패했습니다.');
      }

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    acceptRequest,
    rejectRequest,
    isLoading,
    error,
  };
};

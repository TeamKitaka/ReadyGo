'use client';

import { useState } from 'react';

/**
 * 친구 요청 보내기 훅
 * 친구 요청 전송 기능 제공
 */
export function useSendFriendRequest() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendRequest = async (receiverId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiver_id: receiverId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '친구 요청 전송에 실패했습니다.');
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
    sendRequest,
    isLoading,
    error,
  };
}


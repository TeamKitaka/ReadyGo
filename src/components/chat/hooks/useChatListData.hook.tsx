'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/commons/providers/auth/auth.provider';
import type { ChatRoomListItem } from '@/repositories/chat.repository';

/**
 * Hook 파라미터 타입
 */
export interface UseChatListDataProps {
  isMountedRef: React.MutableRefObject<boolean>;
  optimisticReadRoomsRef: React.MutableRefObject<Set<number>>;
  chatRoomsRef: React.MutableRefObject<ChatRoomListItem[]>;
  setChatRooms: React.Dispatch<React.SetStateAction<ChatRoomListItem[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Hook 반환 타입
 */
export interface UseChatListDataReturn {
  refresh: () => Promise<void>;
}

/**
 * useChatListData Hook
 *
 * - 채팅방 목록 조회 (API)
 * - 상태 관리
 */
export const useChatListData = (
  props: UseChatListDataProps
): UseChatListDataReturn => {
  const {
    isMountedRef,
    optimisticReadRoomsRef,
    chatRoomsRef,
    setChatRooms,
    setIsLoading,
    setError,
  } = props;
  const { user } = useAuth();
  const pathname = usePathname();

  /**
   * 내부 refresh 함수 (API를 통해 전체 목록 재조회)
   */
  const refresh = useCallback(async () => {
    // unmount 체크
    if (!isMountedRef.current) {
      return;
    }

    // user?.id가 없으면 조회하지 않음
    if (!user?.id) {
      if (isMountedRef.current) {
        setChatRooms([]);
        setIsLoading(false);
      }
      return;
    }

    try {
      const response = await fetch('/api/chat/rooms', {
        method: 'GET',
        credentials: 'include',
      });

      if (!isMountedRef.current) {
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = `API error: 채팅방 목록 조회 실패: ${
          errorData.error || 'Unknown error'
        }`;
        setError(errorMessage);
        setIsLoading(false);
        console.error(errorMessage);
        return;
      }

      const result = await response.json();
      const rooms: ChatRoomListItem[] = result.data || [];

      if (isMountedRef.current) {
        // 현재 접속 중인 채팅방 ID 확인
        const currentRoomIdMatch = pathname?.match(/^\/chat\/(\d+)$/);
        const currentRoomId = currentRoomIdMatch
          ? parseInt(currentRoomIdMatch[1], 10)
          : null;

        // DB에서 조회한 실제 unreadCount를 우선하며, 낙관적 처리 상태와 동기화
        const updatedRooms = rooms.map((room) => {
          const roomId = room.room.id || 0;
          const hasOptimisticRead = optimisticReadRoomsRef.current.has(roomId);

          // 현재 접속 중인 채팅방이거나 낙관적으로 읽음 처리된 채팅방은 UI에서 0으로 표시
          // (낙관적 읽음 처리는 새 메시지가 와야만 제거됨)
          if (currentRoomId === roomId || hasOptimisticRead) {
            return { ...room, unreadCount: 0 };
          }

          return room;
        });

        chatRoomsRef.current = updatedRooms; // ref 업데이트
        setChatRooms(updatedRooms);
        setIsLoading(false);
        setError(null);
      }
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      const errorMessage = `API error: 채팅방 목록 조회 실패: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`;
      setError(errorMessage);
      setIsLoading(false);
      console.error(errorMessage);
    }
  }, [
    user?.id,
    pathname,
    isMountedRef,
    optimisticReadRoomsRef,
    chatRoomsRef,
    setChatRooms,
    setIsLoading,
    setError,
  ]);

  return {
    refresh,
  };
};

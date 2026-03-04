'use client';

import { useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/commons/providers/auth/auth.provider';
import type { ChatMessage } from '@/types/chat';
import type { ChatRoomListItem } from '@/repositories/chat.repository';

/**
 * Hook 파라미터 타입
 */
export interface UseChatListUpdatesProps {
  optimisticReadRoomsRef: React.MutableRefObject<Set<number>>;
  chatRoomsRef: React.MutableRefObject<ChatRoomListItem[]>;
  setChatRooms: React.Dispatch<React.SetStateAction<ChatRoomListItem[]>>;
  refresh: () => Promise<void>; // debounced refresh 함수
}

/**
 * Hook 반환 타입
 */
export interface UseChatListUpdatesReturn {
  markRoomAsReadOptimistic: (roomId: number) => void;
  getOptimisticUnreadCount: (roomId: number) => number | null;
  scheduleMessageUpdate: (newMessage: {
    id?: number;
    room_id?: number;
    sender_id?: string;
    content?: string | null;
    content_type?: string;
    created_at?: string;
    is_read?: boolean;
  }) => void;
  processPendingMessageUpdates: () => void;
  messageUpdateTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  pendingMessageUpdatesRef: React.MutableRefObject<
    Map<
      number,
      {
        message: {
          id?: number;
          room_id?: number;
          sender_id?: string;
          content?: string | null;
          content_type?: string;
          created_at?: string;
          is_read?: boolean;
        };
        count: number;
      }
    >
  >;
}

/**
 * useChatListUpdates Hook
 *
 * - 낙관적 업데이트
 * - 메시지 업데이트 배치 처리
 */
export const useChatListUpdates = (
  props: UseChatListUpdatesProps
): UseChatListUpdatesReturn => {
  const {
    optimisticReadRoomsRef,
    chatRoomsRef,
    setChatRooms,
    refresh: _refresh,
  } = props;
  const { user } = useAuth();
  const pathname = usePathname();

  const messageUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessageUpdatesRef = useRef<
    Map<
      number,
      {
        message: {
          id?: number;
          room_id?: number;
          sender_id?: string;
          content?: string | null;
          content_type?: string;
          created_at?: string;
          is_read?: boolean;
        };
        count: number;
      }
    >
  >(new Map());

  /**
   * 낙관적 업데이트: 특정 채팅방의 unreadCount를 즉시 0으로 설정
   */
  const markRoomAsReadOptimistic = useCallback(
    (roomId: number) => {
      // 낙관적으로 읽음 처리된 채팅방 ID 저장
      optimisticReadRoomsRef.current.add(roomId);

      setChatRooms((prev) => {
        const updated = prev.map((room) =>
          room.room.id === roomId ? { ...room, unreadCount: 0 } : room
        );
        chatRoomsRef.current = updated; // ref 업데이트
        return updated;
      });
    },
    [optimisticReadRoomsRef, chatRoomsRef, setChatRooms]
  );

  /**
   * 낙관적 unreadCount 조회: refresh 후에도 낙관적으로 읽음 처리된 채팅방은 0 반환
   */
  const getOptimisticUnreadCount = useCallback(
    (roomId: number): number | null => {
      if (optimisticReadRoomsRef.current.has(roomId)) {
        return 0;
      }
      return null; // 낙관적 처리되지 않은 경우 null 반환
    },
    [optimisticReadRoomsRef]
  );

  /**
   * 배치 메시지 업데이트 처리 함수
   */
  const processPendingMessageUpdates = useCallback(() => {
    if (pendingMessageUpdatesRef.current.size === 0) {
      return;
    }

    // 현재 열려있는 채팅방 확인
    const currentRoomIdMatch = pathname?.match(/^\/chat\/(\d+)$/);
    const currentRoomId = currentRoomIdMatch
      ? parseInt(currentRoomIdMatch[1], 10)
      : null;

    // ref를 통해 최신 상태 참조
    const currentRooms = chatRoomsRef.current;

    const updatedRooms = [...currentRooms];
    const updates = pendingMessageUpdatesRef.current;

    // 각 채팅방별로 업데이트 적용
    updates.forEach((update, roomId) => {
      const roomIndex = updatedRooms.findIndex((r) => r.room.id === roomId);
      if (roomIndex === -1) {
        return; // 채팅방이 목록에 없으면 무시
      }

      const room = updatedRooms[roomIndex];
      const lastMessage: ChatMessage | undefined = update.message.id
        ? {
            id: update.message.id,
            room_id: roomId,
            sender_id: update.message.sender_id || '',
            content: update.message.content || null,
            content_type:
              (update.message.content_type as 'text' | 'image' | 'system') ||
              'text',
            created_at: update.message.created_at || new Date().toISOString(),
            is_read: update.message.is_read || false,
          }
        : undefined;

      // unreadCount 계산
      const isFromOther = update.message.sender_id !== user?.id;
      const isCurrentRoom = currentRoomId === roomId;

      let newUnreadCount: number;
      if (isCurrentRoom) {
        // 현재 열려있는 채팅방이면 unreadCount를 0으로 설정 (실시간으로 보고 있으므로)
        newUnreadCount = 0;
        // 낙관적 읽음 처리 유지 (채팅방이 열려있으므로)
        optimisticReadRoomsRef.current.add(roomId);
      } else if (isFromOther) {
        // 다른 채팅방이고 상대방 메시지면 unreadCount 증가
        newUnreadCount = (room.unreadCount || 0) + update.count;
        // 낙관적 읽음 처리 제거 (새 메시지가 왔으므로)
        optimisticReadRoomsRef.current.delete(roomId);
      } else {
        // 내가 보낸 메시지이면 unreadCount 유지
        newUnreadCount = room.unreadCount || 0;
      }

      updatedRooms[roomIndex] = {
        ...room,
        lastMessage,
        unreadCount: newUnreadCount,
      };
    });

    // 최신 메시지 순으로 정렬 (메시지가 없으면 채팅방 생성 시각 사용)
    updatedRooms.sort((a, b) => {
      const aTime = a.lastMessage?.created_at
        ? new Date(a.lastMessage.created_at).getTime()
        : a.room.created_at
          ? new Date(a.room.created_at).getTime()
          : 0;
      const bTime = b.lastMessage?.created_at
        ? new Date(b.lastMessage.created_at).getTime()
        : b.room.created_at
          ? new Date(b.room.created_at).getTime()
          : 0;
      return bTime - aTime;
    });

    // 상태 업데이트
    chatRoomsRef.current = updatedRooms;
    setChatRooms(updatedRooms);

    // 대기 중인 업데이트 초기화
    pendingMessageUpdatesRef.current.clear();
    messageUpdateTimerRef.current = null;
  }, [pathname, user?.id, optimisticReadRoomsRef, chatRoomsRef, setChatRooms]);

  /**
   * 메시지 업데이트를 스케줄링하는 함수
   */
  const scheduleMessageUpdate = useCallback(
    (newMessage: {
      id?: number;
      room_id?: number;
      sender_id?: string;
      content?: string | null;
      content_type?: string;
      created_at?: string;
      is_read?: boolean;
    }) => {
      if (!newMessage || !newMessage.room_id) {
        return;
      }

      const roomId = newMessage.room_id;
      const existing = pendingMessageUpdatesRef.current.get(roomId);
      const isFromOther = newMessage.sender_id !== user?.id;

      if (existing) {
        // 같은 채팅방의 메시지가 이미 대기 중이면 카운트만 증가 (상대방 메시지만)
        if (isFromOther) {
          existing.count += 1;
        }
        // 항상 최신 메시지로 업데이트
        existing.message = newMessage;
      } else {
        // 새로운 업데이트 추가
        pendingMessageUpdatesRef.current.set(roomId, {
          message: newMessage,
          count: isFromOther ? 1 : 0,
        });
      }

      // 타이머가 없으면 새로 설정 (50ms 후 배치 처리)
      if (!messageUpdateTimerRef.current) {
        messageUpdateTimerRef.current = setTimeout(() => {
          processPendingMessageUpdates();
        }, 50);
      }
    },
    [user?.id, processPendingMessageUpdates]
  );

  return {
    markRoomAsReadOptimistic,
    getOptimisticUnreadCount,
    scheduleMessageUpdate,
    processPendingMessageUpdates,
    messageUpdateTimerRef,
    pendingMessageUpdatesRef,
  };
};

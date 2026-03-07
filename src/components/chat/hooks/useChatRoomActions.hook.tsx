'use client';

import { useRef, useCallback } from 'react';
import React from 'react';

import { useAuth } from '@/commons/providers/auth/auth.provider';
import { useChatList } from './useChatList.hook';
import type { Database } from '@/types/supabase';
import { calculateScrollPosition } from '@/lib/chat/chatRoomHelpers';

// 타입 정의
type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

/**
 * Hook 파라미터 타입
 */
export interface UseChatRoomActionsProps {
  roomId: number;
  triggerScrollToBottom?: () => void; // 스크롤 트리거 함수
  setMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>; // 메시지 상태 업데이트 함수
  markRoomAsReadOptimistic?: (roomId: number) => void; // 낙관적 읽음 처리
  hasMarkedAsReadRef?: React.MutableRefObject<boolean>; // 읽음 처리 상태 ref
}

/**
 * Hook 반환 타입
 */
export interface UseChatRoomActionsReturn {
  sendMessage: (content: string, contentType?: string) => Promise<void>;
  markAsRead: (messageIds: number[]) => Promise<void>;
  markAsReadOnScroll: (containerRef: React.RefObject<HTMLDivElement>) => void;
  markRoomAsRead: (targetRoomId: number) => Promise<void>;
}

/**
 * useChatRoomActions Hook
 *
 * - 메시지 전송
 * - 읽음 처리 (자동, 수동, 스크롤 기반)
 */
export const useChatRoomActions = (
  props: UseChatRoomActionsProps
): UseChatRoomActionsReturn => {
  const {
    roomId,
    triggerScrollToBottom,
    setMessages,
    markRoomAsReadOptimistic,
    hasMarkedAsReadRef,
  } = props;
  const { user } = useAuth();

  const { markRoomAsReadOptimistic: markRoomAsReadOptimisticFromList } =
    useChatList();

  const isSendingRef = useRef(false);

  /**
   * 메시지 전송
   */
  const sendMessage = useCallback(
    async (content: string, contentType: string = 'text'): Promise<void> => {
      if (isSendingRef.current) {
        console.warn(
          '[useChatRoom] Message is already being sent, ignoring duplicate request'
        );
        return;
      }

      if (!roomId || roomId <= 0) {
        throw new Error('유효한 채팅방이 선택되지 않았습니다.');
      }

      if (!user?.id) {
        throw new Error('로그인이 필요합니다.');
      }

      isSendingRef.current = true;

      try {
        const response = await fetch('/api/chat/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            roomId,
            content,
            contentType,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '메시지 전송에 실패했습니다.');
        }

        // postgres_changes 구독이 자동으로 메시지를 추가하므로
        // 여기서는 로컬 상태에 추가하지 않음 (중복 방지)
        triggerScrollToBottom?.();
      } catch (error) {
        console.error('[useChatRoom] Failed to send message:', error);
        throw error;
      } finally {
        isSendingRef.current = false;
      }
    },
    [roomId, user?.id, triggerScrollToBottom]
  );

  /**
   * 읽음 처리 (자동 - roomId 변경 시)
   */
  const markRoomAsRead = useCallback(
    async (targetRoomId: number) => {
      if (!targetRoomId || targetRoomId <= 0) {
        return;
      }

      if (!user?.id) {
        return;
      }

      // 중복 호출 방지는 useChatRoom에서 관리

      try {
        const response = await fetch('/api/chat/message/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            roomId: targetRoomId,
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
          return;
        }

        await response.json().catch(() => ({}));

        // 읽음 처리 후 로컬 상태 업데이트
        if (setMessages) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.room_id === targetRoomId && msg.sender_id !== user.id
                ? { ...msg, is_read: true }
                : msg
            )
          );
        }

        // 채팅 목록의 안읽은 표시 즉시 업데이트
        const optimisticFn =
          markRoomAsReadOptimistic || markRoomAsReadOptimisticFromList;
        optimisticFn(targetRoomId);

        // 읽음 처리 완료 표시
        if (hasMarkedAsReadRef) {
          hasMarkedAsReadRef.current = true;
        }
      } catch {
        // 백그라운드 처리이므로 사용자에게 에러 표시하지 않음
      }
    },
    [
      user?.id,
      setMessages,
      markRoomAsReadOptimistic,
      markRoomAsReadOptimisticFromList,
      hasMarkedAsReadRef,
    ]
  );

  /**
   * 스크롤 기반 읽음 처리
   */
  const markAsReadOnScroll = useCallback(
    (containerRef: React.RefObject<HTMLDivElement>) => {
      if (!roomId || roomId <= 0 || !user?.id) {
        return;
      }

      const scrollInfo = calculateScrollPosition(containerRef.current);
      if (!scrollInfo) {
        return;
      }

      // 스크롤 가능한 높이가 없거나 하단에서 50px 이내이면 최하단으로 간주
      if (scrollInfo.isAtBottom) {
        markRoomAsRead(roomId).catch((error) => {
          console.error('Failed to mark room as read on scroll:', error);
        });
      }
    },
    [roomId, user?.id, markRoomAsRead]
  );

  /**
   * 읽음 처리 (수동 - 특정 메시지)
   */
  const markAsRead = useCallback(
    async (messageIds: number[]) => {
      if (!user?.id || messageIds.length === 0) {
        return;
      }

      try {
        const response = await fetch('/api/chat/message/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            roomId,
            messageIds,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '읽음 처리에 실패했습니다.');
        }

        // 읽음 처리 후 로컬 상태 업데이트
        if (setMessages) {
          setMessages((prev) =>
            prev.map((msg) =>
              messageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
            )
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '읽음 처리에 실패했습니다.';
        console.error('Failed to mark messages as read:', error);
        throw new Error(errorMessage);
      }
    },
    [roomId, user?.id, setMessages]
  );

  return {
    sendMessage,
    markAsRead,
    markAsReadOnScroll,
    markRoomAsRead,
  };
};

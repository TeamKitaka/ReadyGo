'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';
import React from 'react';

import { useAuth } from '@/commons/providers/auth/auth.provider';
import { useChatList } from './useChatList.hook';
import { getEffectiveStatus } from '@/stores/user-status.store';
import { getAvatarImagePath } from '@/lib/avatar/getAvatarImagePath';
import type { Database } from '@/types/supabase';
import { useChatRoomScroll } from './useChatRoomScroll.hook';
import { useChatRoomMessages } from './useChatRoomMessages.hook';
import { useChatRoomActions } from './useChatRoomActions.hook';

// 타입 정의
type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

/**
 * 포맷된 메시지 아이템 타입
 */
export interface FormattedMessageItem {
  type: 'date-divider' | 'unread-divider' | 'message';
  date?: string | null;
  formattedDate?: string;
  message?: ChatMessage;
  isConsecutive?: boolean;
  isGroupStart?: boolean;
  isGroupEnd?: boolean;
  isOwnMessage?: boolean;
  formattedTime?: string;
  formattedContent?: string;
  isRead?: boolean;
}

/**
 * 포맷된 상대방 정보 타입
 */
export interface FormattedOtherMemberInfo {
  id: string;
  nickname: string;
  avatarImagePath: string;
  userStatus: 'online' | 'away' | 'dnd' | 'offline';
  animalType?: string;
}

/**
 * Hook 파라미터 타입
 */
export interface UseChatRoomProps {
  roomId: number;
  onMessage?: (message: ChatMessage) => void;
}

/**
 * Hook 반환 타입
 */
export interface UseChatRoomReturn {
  messages: ChatMessage[];
  formattedMessages: FormattedMessageItem[];
  otherMemberInfo: FormattedOtherMemberInfo | null;
  isOtherMemberInfoLoading: boolean;
  isBlocked: boolean;
  sendMessage: (content: string, contentType?: string) => Promise<void>;
  markAsRead: (messageIds: number[]) => Promise<void>;
  markAsReadOnScroll: (containerRef: React.RefObject<HTMLDivElement>) => void;
  setMessageListContainerRef: (ref: React.RefObject<HTMLDivElement>) => void;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  scrollToBottom: (containerRef: React.RefObject<HTMLDivElement>) => void;
  scrollToUnreadBoundary: (
    containerRef: React.RefObject<HTMLDivElement>
  ) => void;
  getUnreadBoundaryMessageId: () => number | null;
  shouldShowScrollToBottomButton: (
    containerRef: React.RefObject<HTMLDivElement>
  ) => boolean;
  shouldScrollToBottom: boolean;
  shouldScrollToUnread: boolean;
  clearScrollTriggers: () => void;
  roomCreatedAt: string | null;
}

/**
 * useChatRoom Hook
 *
 * 분리된 hooks를 조합하여 채팅방 기능을 제공합니다.
 * - useChatRoomMessages: 메시지 로드, Realtime 구독, 포맷팅
 * - useChatRoomActions: 메시지 전송, 읽음 처리
 * - useChatRoomScroll: 스크롤 관리
 */
export const useChatRoom = (props: UseChatRoomProps): UseChatRoomReturn => {
  const { roomId, onMessage } = props;
  const { user } = useAuth();

  // useChatList Hook 호출하여 chatRooms 조회
  const {
    chatRooms,
    isLoading: isChatListLoading,
    markRoomAsReadOptimistic,
  } = useChatList();

  // Refs
  const messageListContainerRef =
    useRef<React.RefObject<HTMLDivElement> | null>(null);
  const previousRoomIdRef = useRef<number | null>(null);
  const readTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerScrollToBottomRef = useRef<(() => void) | null>(null);
  const markRoomAsReadRef = useRef<((roomId: number) => Promise<void>) | null>(
    null
  );
  const hasMarkedAsReadRef = useRef<boolean>(false);

  // Messages hook
  const messagesHook = useChatRoomMessages({
    roomId,
    onMessage,
    triggerScrollToBottom: triggerScrollToBottomRef.current || undefined,
    markRoomAsReadRef,
    messageListContainerRef: messageListContainerRef.current || undefined,
    hasMarkedAsReadRef,
  });

  // Actions hook
  const actionsHook = useChatRoomActions({
    roomId,
    triggerScrollToBottom: triggerScrollToBottomRef.current || undefined,
    setMessages: messagesHook.setMessages,
    markRoomAsReadOptimistic,
    hasMarkedAsReadRef,
  });

  // markRoomAsRead ref 업데이트
  useEffect(() => {
    markRoomAsReadRef.current = actionsHook.markRoomAsRead;
  }, [actionsHook.markRoomAsRead]);

  // Scroll hook
  const scrollHook = useChatRoomScroll({
    formattedMessages: messagesHook.formattedMessages,
    userId: user?.id,
    isLoading: messagesHook.isLoading,
  });

  // 스크롤 트리거 함수 ref 업데이트
  useEffect(() => {
    triggerScrollToBottomRef.current = scrollHook.triggerScrollToBottom;
  }, [scrollHook.triggerScrollToBottom]);

  /**
   * roomId 변경 시 읽음 처리 및 cleanup
   */
  useEffect(() => {
    if (!roomId || roomId <= 0) {
      const prevRoomId = previousRoomIdRef.current;
      if (prevRoomId && prevRoomId > 0 && user?.id) {
        markRoomAsReadOptimistic(prevRoomId);
        if (markRoomAsReadRef.current) {
          markRoomAsReadRef.current(prevRoomId).catch((error) => {
            console.error('Failed to mark previous room as read:', error);
          });
        }
      }
      previousRoomIdRef.current = null;
      actionsHook.hasMarkedAsReadRef.current = false;
      return;
    }

    if (!user?.id) {
      previousRoomIdRef.current = null;
      actionsHook.hasMarkedAsReadRef.current = false;
      return;
    }

    // 이전 채팅방이 있고 현재 채팅방과 다르면 읽음 처리
    const prevRoomId = previousRoomIdRef.current;
    if (prevRoomId && prevRoomId !== roomId && prevRoomId > 0) {
      markRoomAsReadOptimistic(prevRoomId);
      if (markRoomAsReadRef.current) {
        markRoomAsReadRef.current(prevRoomId).catch((error) => {
          console.error('Failed to mark previous room as read:', error);
        });
      }
    }

    previousRoomIdRef.current = roomId;
    hasMarkedAsReadRef.current = false;

    // 기존 타이머 정리
    if (readTimerRef.current) {
      clearTimeout(readTimerRef.current);
      readTimerRef.current = null;
    }

    // 타이머 기반 읽음 처리: 채팅방 접속 후 3초 후 읽음 처리
    readTimerRef.current = setTimeout(() => {
      if (
        !hasMarkedAsReadRef.current &&
        previousRoomIdRef.current === roomId &&
        markRoomAsReadRef.current
      ) {
        markRoomAsReadRef.current(roomId).catch((error) => {
          console.error('Failed to mark room as read on timer:', error);
        });
      }
    }, 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user?.id]);

  /**
   * 메시지 리스트 컨테이너 ref 설정 함수
   */
  const setMessageListContainerRef = useCallback(
    (ref: React.RefObject<HTMLDivElement>) => {
      messageListContainerRef.current = ref;
    },
    []
  );

  /**
   * 컴포넌트 언마운트 시 cleanup
   */
  useEffect(() => {
    return () => {
      if (readTimerRef.current) {
        clearTimeout(readTimerRef.current);
        readTimerRef.current = null;
      }

      // 언마운트 시 현재 채팅방 읽음 처리
      const currentRoomId = previousRoomIdRef.current;
      if (currentRoomId && currentRoomId > 0 && user?.id) {
        markRoomAsReadOptimistic(currentRoomId);
        if (markRoomAsReadRef.current) {
          markRoomAsReadRef.current(currentRoomId).catch((error) => {
            console.error('Failed to mark room as read on unmount:', error);
          });
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 상대방 정보 조회 및 포맷팅
   */
  const otherMemberInfo = useMemo<FormattedOtherMemberInfo | null>(() => {
    if (!roomId || roomId <= 0) {
      return null;
    }

    const chatRoomItem = chatRooms.find((item) => item.room.id === roomId);

    if (!chatRoomItem?.otherMember) {
      return null;
    }

    const { otherMember } = chatRoomItem;

    return {
      id: otherMember.id,
      nickname: otherMember.nickname ?? '알 수 없음',
      avatarImagePath: getAvatarImagePath(
        otherMember.avatar_url,
        otherMember.animal_type
      ),
      userStatus: getEffectiveStatus(otherMember.id),
      animalType: otherMember.animal_type ?? undefined,
    };
  }, [roomId, chatRooms]);

  /**
   * 상대방 정보 로딩 상태
   */
  const isOtherMemberInfoLoading = useMemo<boolean>(() => {
    if (!roomId || roomId <= 0) {
      return false;
    }

    if (isChatListLoading) {
      return true;
    }

    if (!otherMemberInfo) {
      return true;
    }

    return false;
  }, [roomId, isChatListLoading, otherMemberInfo]);

  /**
   * 차단 상태 확인
   */
  const isBlocked = useMemo<boolean>(() => {
    if (!roomId || roomId <= 0 || !user?.id) {
      return false;
    }

    if (!otherMemberInfo || !otherMemberInfo.id) {
      return false;
    }

    // TODO: API를 통해 차단 상태 확인
    return false;
  }, [roomId, user?.id, otherMemberInfo]);

  /**
   * 채팅방 생성 날짜
   */
  const roomCreatedAt = useMemo<string | null>(() => {
    if (!roomId || roomId <= 0) {
      return null;
    }

    const chatRoomItem = chatRooms.find((item) => item.room.id === roomId);
    return chatRoomItem?.room.created_at || null;
  }, [roomId, chatRooms]);

  return {
    messages: messagesHook.messages,
    formattedMessages: messagesHook.formattedMessages,
    otherMemberInfo,
    isOtherMemberInfoLoading,
    isBlocked,
    sendMessage: actionsHook.sendMessage,
    markAsRead: actionsHook.markAsRead,
    markAsReadOnScroll: actionsHook.markAsReadOnScroll,
    setMessageListContainerRef,
    isLoading: messagesHook.isLoading,
    error: messagesHook.error,
    isConnected: messagesHook.isConnected,
    scrollToBottom: scrollHook.scrollToBottom,
    scrollToUnreadBoundary: scrollHook.scrollToUnreadBoundary,
    getUnreadBoundaryMessageId: scrollHook.getUnreadBoundaryMessageId,
    shouldShowScrollToBottomButton: scrollHook.shouldShowScrollToBottomButton,
    shouldScrollToBottom: scrollHook.shouldScrollToBottom,
    shouldScrollToUnread: scrollHook.shouldScrollToUnread,
    clearScrollTriggers: scrollHook.clearScrollTriggers,
    roomCreatedAt,
  };
};
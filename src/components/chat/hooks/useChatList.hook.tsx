'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/commons/providers/auth/auth.provider';
import { getEffectiveStatus } from '@/stores/user-status.store';
import { getAvatarImagePath } from '@/lib/avatar/getAvatarImagePath';
import type { ChatRoomListItem } from '@/repositories/chat.repository';
import {
  formatMessageTime,
  formatMessageContent,
  getChatRoomName,
  debounce,
} from '@/lib/chat/chatListHelpers';
import { useChatListData } from './useChatListData.hook';
import { useChatListUpdates } from './useChatListUpdates.hook';
import { useChatListRealtime } from './useChatListRealtime.hook';

/**
 * Hook 파라미터 타입
 */
export interface UseChatListProps {
  autoRefresh?: boolean; // 기본값: true
  refreshInterval?: number; // 기본값: 30000 (30초)
}

/**
 * 포맷된 채팅방 아이템 타입 (UI에서 바로 사용 가능)
 */
export interface FormattedChatRoomItem {
  roomId: number;
  roomName: string;
  avatarImagePath: string;
  userStatus: 'online' | 'away' | 'dnd' | 'offline';
  messageContent: string;
  messageTime: string;
  unreadCount: number;
  isSelected?: boolean;
  // 원본 데이터 (필요한 경우)
  originalData: ChatRoomListItem;
}

/**
 * Hook 반환 타입
 */
export interface UseChatListReturn {
  chatRooms: ChatRoomListItem[]; // 원본 데이터 (하위 호환성)
  formattedChatRooms: FormattedChatRoomItem[]; // UI에서 바로 사용 가능한 포맷된 데이터
  isLoading: boolean;
  error: string | null;
  markRoomAsReadOptimistic: (roomId: number) => void; // 낙관적 업데이트 함수
  getOptimisticUnreadCount: (roomId: number) => number | null; // 낙관적 unreadCount 조회
}

/**
 * useChatList Hook
 *
 * 분리된 hooks를 조합하여 채팅 목록 기능을 제공합니다.
 * - useChatListData: 목록 조회, 상태 관리
 * - useChatListUpdates: 낙관적 업데이트, 메시지 업데이트 배치
 * - useChatListRealtime: Realtime 구독, 채널 관리
 */
export const useChatList = (props?: UseChatListProps): UseChatListReturn => {
  const { autoRefresh = true, refreshInterval = 30000 } = props || {};
  const { user } = useAuth();
  const pathname = usePathname();

  // 상태 관리
  const [chatRooms, setChatRooms] = useState<ChatRoomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const isMountedRef = useRef<boolean>(true);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const optimisticReadRoomsRef = useRef<Set<number>>(new Set());
  const chatRoomsRef = useRef<ChatRoomListItem[]>([]);

  // Data hook
  const dataHook = useChatListData({
    isMountedRef,
    optimisticReadRoomsRef,
    chatRoomsRef,
    setChatRooms,
    setIsLoading,
    setError,
  });

  // Updates hook
  const updatesHook = useChatListUpdates({
    optimisticReadRoomsRef,
    chatRoomsRef,
    setChatRooms,
    refresh: dataHook.refresh,
  });
  const { refresh } = dataHook;
  const { markRoomAsReadOptimistic, getOptimisticUnreadCount } = updatesHook;
  const {
    scheduleMessageUpdate,
    messageUpdateTimerRef,
    pendingMessageUpdatesRef,
  } = updatesHook;

  // debounced refresh 함수
  const debouncedRefresh = useMemo(
    () =>
      debounce((...args: Parameters<typeof refresh>) => {
        refresh(...args);
      }, 300),
    [refresh]
  );

  // Realtime hook
  const realtimeHook = useChatListRealtime({
    optimisticReadRoomsRef,
    chatRoomsRef,
    setChatRooms,
    debouncedRefresh,
    markRoomAsReadOptimistic,
    scheduleMessageUpdate,
    messageUpdateTimerRef,
    pendingMessageUpdatesRef,
  });
  const { cleanupChannel, subscribeToPostgresChanges } = realtimeHook;

  /**
   * 초기 목록 로드 및 postgres_changes 구독
   */
  useEffect(() => {
    if (!user?.id) {
      if (isMountedRef.current) {
        setChatRooms([]);
        setIsLoading(false);
      }
      cleanupChannel();
      return;
    }

    // 초기 목록 로드
    refresh();
    // postgres_changes 구독
    subscribeToPostgresChanges(user.id);

    // cleanup 함수
    return () => {
      cleanupChannel();
    };
  }, [user?.id, refresh, subscribeToPostgresChanges, cleanupChannel]);

  /**
   * 자동 새로고침 구현
   */
  useEffect(() => {
    if (!autoRefresh || !user?.id) {
      // 기존 타이머 정리
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
      return;
    }

    // 타이머 설정
    autoRefreshTimerRef.current = setInterval(() => {
      refresh();
    }, refreshInterval);

    // cleanup 함수
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, user?.id, refresh]);

  /**
   * 컴포넌트 언마운트 시 cleanup
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // postgres_changes 채널 정리
      cleanupChannel();
      // 자동 새로고침 타이머 정리
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
      // 메시지 업데이트 타이머 정리
      if (messageUpdateTimerRef.current) {
        clearTimeout(messageUpdateTimerRef.current);
        messageUpdateTimerRef.current = null;
      }
    };
  }, [cleanupChannel, messageUpdateTimerRef]);

  /**
   * 포맷된 채팅방 목록 계산 (UI에서 바로 사용 가능)
   */
  const formattedChatRooms = useMemo<FormattedChatRoomItem[]>(() => {
    // 현재 접속 중인 채팅방 ID 확인
    const currentRoomIdMatch = pathname?.match(/^\/chat\/(\d+)$/);
    const currentRoomId = currentRoomIdMatch
      ? parseInt(currentRoomIdMatch[1], 10)
      : null;

    return chatRooms.map((item) => {
      const { room, otherMember, lastMessage, unreadCount } = item;
      const roomId = room.id || 0;

      // 채팅방 이름
      const roomName = getChatRoomName(room, otherMember);

      // 아바타 이미지 경로
      const avatarImagePath = getAvatarImagePath(
        otherMember?.avatar_url,
        otherMember?.animal_type
      );

      // 사용자 상태
      const userStatus = otherMember?.id
        ? getEffectiveStatus(otherMember.id)
        : 'offline';

      // 메시지 내용
      const messageContent = formatMessageContent(lastMessage);

      // 메시지 시간
      const messageTime = lastMessage?.created_at
        ? formatMessageTime(lastMessage.created_at)
        : '';

      // UI에서 표시할 unreadCount 계산
      let displayUnreadCount = unreadCount;

      // 현재 접속 중인 채팅방이면 항상 0으로 표시
      if (currentRoomId === roomId) {
        displayUnreadCount = 0;
      }
      // 낙관적으로 읽음 처리된 채팅방이면 0으로 표시 (채팅방 이동 시 즉시 반영)
      else if (optimisticReadRoomsRef.current.has(roomId)) {
        displayUnreadCount = 0;
      }

      return {
        roomId,
        roomName,
        avatarImagePath,
        userStatus,
        messageContent,
        messageTime,
        unreadCount: displayUnreadCount,
        originalData: item,
      };
    });
  }, [chatRooms, pathname]);

  return {
    chatRooms, // 하위 호환성을 위해 유지
    formattedChatRooms,
    isLoading,
    error,
    markRoomAsReadOptimistic,
    getOptimisticUnreadCount,
  };
};

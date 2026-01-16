'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import React from 'react';

import { supabase as baseSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import type { Database } from '@/types/supabase';
import {
  formatMessageTime,
  formatDateDivider,
  isNewDate,
  isConsecutiveMessage,
  isSameTimeGroup,
  formatMessageContent,
} from '@/lib/chat/messageFormatter';
import {
  sortMessagesByCreatedAt,
  applyReadStatusToMessage,
  calculateScrollPosition,
} from '@/lib/chat/chatRoomHelpers';

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
 * Hook 파라미터 타입
 */
export interface UseChatRoomMessagesProps {
  roomId: number;
  onMessage?: (message: ChatMessage) => void;
  onNewMessage?: (message: ChatMessage) => void; // 새 메시지 수신 시 콜백
  triggerScrollToBottom?: () => void; // 스크롤 트리거 함수
  markRoomAsReadRef?: React.MutableRefObject<
    ((roomId: number) => Promise<void>) | null
  >; // 읽음 처리 함수 ref
  messageListContainerRef?: React.RefObject<HTMLDivElement>; // 메시지 리스트 컨테이너 ref
  hasMarkedAsReadRef?: React.MutableRefObject<boolean>; // 읽음 처리 상태 ref
}

/**
 * Hook 반환 타입
 */
export interface UseChatRoomMessagesReturn {
  messages: ChatMessage[];
  formattedMessages: FormattedMessageItem[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  initialLoadMessageIds: Set<number>; // 초기 로드된 메시지 ID들
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>; // 메시지 상태 업데이트 함수
}

/**
 * useChatRoomMessages Hook
 *
 * - 초기 메시지 로드 (API)
 * - postgres_changes로 INSERT 구독
 * - 메시지 그룹화 및 포맷팅
 */
export const useChatRoomMessages = (
  props: UseChatRoomMessagesProps
): UseChatRoomMessagesReturn => {
  const {
    roomId,
    onMessage,
    onNewMessage,
    triggerScrollToBottom,
    markRoomAsReadRef,
    messageListContainerRef,
    hasMarkedAsReadRef,
  } = props;
  const { user } = useAuth();

  // 상태 관리
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // postgres_changes 채널 관리
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRoomIdRef = useRef<number | null>(null);
  const onMessageRef = useRef(onMessage);
  const seenMessageIdsRef = useRef<Set<number>>(new Set());
  const initialLoadMessageIdsRef = useRef<Set<number>>(new Set());
  const retryCountRef = useRef<number>(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldAutoScrollRef = useRef(true);

  // onMessage ref 업데이트
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  /**
   * 새 메시지 처리 (중복 제거 포함)
   */
  const handleNewMessage = useCallback(
    (message: ChatMessage) => {
      // 중복 체크
      if (seenMessageIdsRef.current.has(message.id)) {
        return;
      }
      seenMessageIdsRef.current.add(message.id);

      // 자신이 보낸 메시지이면 최하단 스크롤 트리거
      if (message.sender_id === user?.id) {
        shouldAutoScrollRef.current = true;
        triggerScrollToBottom?.();
      } else if (shouldAutoScrollRef.current) {
        // 상대방 메시지이고 자동 스크롤이 활성화되어 있으면 최하단 스크롤
        triggerScrollToBottom?.();
      }

      // 채팅방이 열려있는 상태에서 상대방 메시지가 들어오면 읽음 처리 고려
      if (message.sender_id !== user?.id && message.room_id) {
        if (messageListContainerRef?.current) {
          const scrollInfo = calculateScrollPosition(
            messageListContainerRef.current
          );

          // 스크롤이 최하단에 있으면 (50px 이내) 즉시 읽음 처리
          if (scrollInfo?.isAtBottom) {
            if (
              !hasMarkedAsReadRef?.current &&
              markRoomAsReadRef?.current &&
              message.room_id
            ) {
              markRoomAsReadRef.current(message.room_id).catch((error) => {
                console.error(
                  'Failed to mark room as read on new message:',
                  error
                );
              });
            }
          }
        }
      }

      setMessages((prev) => {
        // 이미 존재하는지 다시 확인 (race condition 방지)
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }

        // 읽음 상태 적용 및 정렬
        const messageWithReadStatus = applyReadStatusToMessage(
          message,
          user?.id
        );
        const newMessages = [...prev, messageWithReadStatus];
        return sortMessagesByCreatedAt(newMessages);
      });

      // 외부 콜백 호출
      onNewMessage?.(message);
    },
    [
      user?.id,
      triggerScrollToBottom,
      markRoomAsReadRef,
      messageListContainerRef,
      hasMarkedAsReadRef,
      onNewMessage,
    ]
  );

  /**
   * postgres_changes 채널 정리 함수
   */
  const cleanupChannel = useCallback(() => {
    const channel = channelRef.current;
    if (channel) {
      channelRef.current = null;
      subscribedRoomIdRef.current = null;
      setIsConnected(false);
      try {
        baseSupabase.removeChannel(channel);
      } catch (error) {
        console.warn(
          'Failed to remove channel (may already be removed):',
          error
        );
      }
    } else {
      subscribedRoomIdRef.current = null;
      setIsConnected(false);
    }

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryCountRef.current = 0;
  }, []);

  /**
   * 초기 메시지 로드 (API)
   */
  const loadMessages = useCallback(async (targetRoomId: number) => {
    if (!targetRoomId || targetRoomId <= 0) {
      setIsLoading(false);
      setMessages([]);
      setIsConnected(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/chat/message?roomId=${targetRoomId}&limit=50&offset=0`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '메시지 로드에 실패했습니다.');
      }

      const result = await response.json();
      const loadedMessages: ChatMessage[] = result.data || [];

      // Repository는 내림차순(최신→과거)으로 반환하므로 reverse 처리 (과거→최신)
      const reversedMessages = [...loadedMessages].reverse();

      // seenMessageIds 초기화 및 업데이트
      seenMessageIdsRef.current = new Set(reversedMessages.map((m) => m.id));

      // 초기 로드된 메시지 ID 저장
      initialLoadMessageIdsRef.current = new Set(
        reversedMessages.map((m) => m.id)
      );

      setMessages(reversedMessages);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '메시지 로드에 실패했습니다.';
      setError(errorMessage);
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * postgres_changes 구독
   */
  const subscribeToPostgresChanges = useCallback(
    async (targetRoomId: number) => {
      if (!targetRoomId || targetRoomId <= 0) {
        setIsConnected(false);
        cleanupChannel();
        return;
      }

      if (!user?.id) {
        setIsConnected(false);
        cleanupChannel();
        return;
      }

      // 중복 구독 방지
      if (subscribedRoomIdRef.current === targetRoomId && channelRef.current) {
        return;
      }

      // 기존 채널 정리
      if (channelRef.current) {
        const oldChannel = channelRef.current;
        channelRef.current = null;
        subscribedRoomIdRef.current = null;
        setIsConnected(false);
        try {
          baseSupabase.removeChannel(oldChannel);
        } catch (error) {
          console.warn('Failed to remove old channel:', error);
        }
      }

      try {
        // postgres_changes 채널 생성
        const channel = baseSupabase
          .channel(`chat:${targetRoomId}:changes`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `room_id=eq.${targetRoomId}`,
            },
            (payload) => {
              try {
                const newMessage = payload.new as ChatMessage;
                handleNewMessage(newMessage);

                if (onMessageRef.current) {
                  try {
                    onMessageRef.current(newMessage);
                  } catch (error) {
                    console.error('Error in onMessage callback:', error);
                  }
                }
              } catch (error) {
                console.error(
                  'Error processing postgres_changes event:',
                  error
                );
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              setError(null);
              retryCountRef.current = 0;
              if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
              }
            } else if (status === 'CHANNEL_ERROR') {
              setIsConnected(false);
              const errorMessage =
                err?.message || 'Postgres changes channel error occurred';
              setError(errorMessage);
              console.error('Channel error:', errorMessage, err);

              if (channelRef.current === channel) {
                channelRef.current = null;
                subscribedRoomIdRef.current = null;
              }

              // 재시도 로직 (최대 3회)
              const maxRetries = 3;
              if (retryCountRef.current < maxRetries) {
                retryCountRef.current += 1;
                const retryDelay = Math.min(
                  1000 * Math.pow(2, retryCountRef.current - 1),
                  5000
                );
                console.log(
                  `Realtime 구독 재시도 (${retryCountRef.current}/${maxRetries}) - ${retryDelay}ms 후`
                );

                retryTimerRef.current = setTimeout(() => {
                  if (
                    subscribedRoomIdRef.current !== targetRoomId ||
                    !channelRef.current
                  ) {
                    subscribeToPostgresChanges(targetRoomId);
                  }
                }, retryDelay);
              } else {
                console.error('Realtime 구독 실패: 최대 재시도 횟수 초과');
                retryCountRef.current = 0;
              }
            } else if (status === 'CLOSED') {
              setIsConnected(false);
              if (channelRef.current === channel) {
                channelRef.current = null;
                subscribedRoomIdRef.current = null;
              }
            } else if (status === 'TIMED_OUT') {
              setIsConnected(false);
              setError('채널 구독 시간 초과');

              // 재시도 로직 (최대 3회)
              const maxRetries = 3;
              if (retryCountRef.current < maxRetries) {
                retryCountRef.current += 1;
                const retryDelay = Math.min(
                  1000 * Math.pow(2, retryCountRef.current - 1),
                  5000
                );
                console.log(
                  `Realtime 구독 재시도 (${retryCountRef.current}/${maxRetries}) - ${retryDelay}ms 후`
                );

                retryTimerRef.current = setTimeout(() => {
                  if (
                    subscribedRoomIdRef.current !== targetRoomId ||
                    !channelRef.current
                  ) {
                    subscribeToPostgresChanges(targetRoomId);
                  }
                }, retryDelay);
              } else {
                console.error('Realtime 구독 실패: 최대 재시도 횟수 초과');
                retryCountRef.current = 0;
              }
            } else {
              setIsConnected(false);
            }
          });

        channelRef.current = channel;
        subscribedRoomIdRef.current = targetRoomId;
      } catch (error) {
        console.error('Failed to setup postgres_changes subscription:', error);
        setError('구독 설정에 실패했습니다.');
        setIsConnected(false);
        cleanupChannel();
      }
    },
    [user?.id, cleanupChannel, handleNewMessage]
  );

  // roomId 또는 user?.id 변경 시 자동 처리
  useEffect(() => {
    if (!roomId || roomId <= 0) {
      cleanupChannel();
      setMessages([]);
      seenMessageIdsRef.current.clear();
      setIsLoading(false);
      setIsConnected(false);
      setError(null);
      return;
    }

    if (!user?.id) {
      cleanupChannel();
      setMessages([]);
      seenMessageIdsRef.current.clear();
      setIsLoading(false);
      setIsConnected(false);
      setError(null);
      return;
    }

    cleanupChannel();
    setMessages([]);
    seenMessageIdsRef.current.clear();
    initialLoadMessageIdsRef.current.clear();
    setIsLoading(true);
    setError(null);

    loadMessages(roomId).then(() => {
      subscribeToPostgresChanges(roomId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user?.id]);

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      cleanupChannel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 중복 제거 및 정렬된 메시지 목록
   */
  const sortedMessages = useMemo(() => {
    const seenIds = new Set<number>();
    return messages.filter((msg) => {
      if (seenIds.has(msg.id)) {
        return false;
      }
      seenIds.add(msg.id);
      return true;
    });
  }, [messages]);

  /**
   * 포맷된 메시지 목록 생성
   */
  const formattedMessages = useMemo<FormattedMessageItem[]>(() => {
    if (!roomId || roomId <= 0 || !user?.id) {
      return [];
    }

    const result: FormattedMessageItem[] = [];
    let hasAddedUnreadDivider = false;

    sortedMessages.forEach((message, index) => {
      const previousMessage = index > 0 ? sortedMessages[index - 1] : null;
      const isOwnMessage = message.sender_id === user.id;
      const isRead = message.is_read ?? false;

      // 안읽은 메시지 구분선 추가
      if (
        !hasAddedUnreadDivider &&
        !isOwnMessage &&
        initialLoadMessageIdsRef.current.has(message.id)
      ) {
        const currentIsRead = message.is_read ?? false;

        if (currentIsRead === false) {
          let shouldAddDivider = false;

          if (!previousMessage) {
            shouldAddDivider = true;
          } else if (previousMessage.sender_id === user.id) {
            shouldAddDivider = true;
          } else {
            const previousCurrentIsRead = previousMessage.is_read ?? false;
            if (previousCurrentIsRead === true) {
              shouldAddDivider = true;
            }
          }

          if (shouldAddDivider) {
            result.push({
              type: 'unread-divider',
            });
            hasAddedUnreadDivider = true;
          }
        }
      }

      // 날짜 구분선 추가
      const showDateDivider = isNewDate(
        message.created_at,
        previousMessage?.created_at || null
      );

      if (showDateDivider) {
        result.push({
          type: 'date-divider',
          date: message.created_at,
          formattedDate: formatDateDivider(message.created_at),
        });
      }

      // 메시지 아이템 추가
      const isConsecutive = isConsecutiveMessage(message, previousMessage);
      const isInSameTimeGroupWithPrevious = isSameTimeGroup(
        message,
        previousMessage
      );

      const nextMessage =
        index < sortedMessages.length - 1 ? sortedMessages[index + 1] : null;
      const isInSameTimeGroupWithNext = nextMessage
        ? isSameTimeGroup(nextMessage, message)
        : false;

      const isGroupStart = !isInSameTimeGroupWithPrevious;
      const isGroupEnd = !isInSameTimeGroupWithNext;

      const formattedTime = formatMessageTime(message.created_at);
      const formattedContent = formatMessageContent(message);

      result.push({
        type: 'message',
        message,
        isConsecutive,
        isGroupStart,
        isGroupEnd,
        isOwnMessage,
        formattedTime,
        formattedContent,
        isRead,
      });
    });

    return result;
  }, [sortedMessages, user?.id, roomId]);

  return {
    messages: sortedMessages,
    formattedMessages,
    isLoading,
    error,
    isConnected,
    initialLoadMessageIds: initialLoadMessageIdsRef.current,
    setMessages,
  };
};

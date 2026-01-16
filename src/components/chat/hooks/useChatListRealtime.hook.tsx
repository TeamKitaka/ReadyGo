'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';

import { supabase as baseSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import type { ChatMessage } from '@/types/chat';
import type { ChatRoomListItem } from '@/repositories/chat.repository';

/**
 * Hook 파라미터 타입
 */
export interface UseChatListRealtimeProps {
  optimisticReadRoomsRef: React.MutableRefObject<Set<number>>;
  chatRoomsRef: React.MutableRefObject<ChatRoomListItem[]>;
  setChatRooms: React.Dispatch<React.SetStateAction<ChatRoomListItem[]>>;
  debouncedRefresh: () => void;
  markRoomAsReadOptimistic: (roomId: number) => void;
  scheduleMessageUpdate: (newMessage: {
    id?: number;
    room_id?: number;
    sender_id?: string;
    content?: string | null;
    content_type?: string;
    created_at?: string;
    is_read?: boolean;
  }) => void;
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
 * Hook 반환 타입
 */
export interface UseChatListRealtimeReturn {
  subscribeToPostgresChanges: (userId: string) => Promise<void>;
  cleanupChannel: () => void;
  channelRef: React.MutableRefObject<RealtimeChannel | null>;
}

/**
 * useChatListRealtime Hook
 *
 * - postgres_changes 구독
 * - 채널 관리
 */
export const useChatListRealtime = (
  props: UseChatListRealtimeProps
): UseChatListRealtimeReturn => {
  const {
    optimisticReadRoomsRef,
    chatRoomsRef,
    setChatRooms,
    debouncedRefresh,
    markRoomAsReadOptimistic,
    scheduleMessageUpdate,
    messageUpdateTimerRef,
    pendingMessageUpdatesRef,
  } = props;
  const { user } = useAuth();
  const pathname = usePathname();

  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedUserIdRef = useRef<string | null>(null);

  /**
   * postgres_changes 채널 정리 함수
   */
  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      baseSupabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    subscribedUserIdRef.current = null;

    // 대기 중인 메시지 업데이트 타이머 정리
    if (messageUpdateTimerRef.current) {
      clearTimeout(messageUpdateTimerRef.current);
      messageUpdateTimerRef.current = null;
    }
    pendingMessageUpdatesRef.current.clear();
  }, [messageUpdateTimerRef, pendingMessageUpdatesRef]);

  /**
   * postgres_changes 구독
   */
  const subscribeToPostgresChanges = useCallback(
    async (userId: string) => {
      // 중복 구독 방지
      if (subscribedUserIdRef.current === userId && channelRef.current) {
        return;
      }

      // 기존 채널 정리
      if (channelRef.current && subscribedUserIdRef.current !== userId) {
        cleanupChannel();
      }

      /**
       * Postgres Changes 구독 설정
       * Supabase Realtime은 자동으로 세션을 확인하므로 별도 세션 확인 불필요
       */
      const setupRealtimeSubscription = async () => {
        try {
          // postgres_changes 채널 생성
          // 채널 이름에 userId를 포함하여 고유성 보장
          const channelName = `chat_list:${userId}:${Date.now()}`;
          const channel = baseSupabase
            .channel(channelName, {
              config: {
                broadcast: { self: false },
                presence: { key: userId },
              },
            })
            // chat_room_members: 사용자가 참여한 채팅방 변경 감지
            // RLS 정책으로 자동 필터링됨 (클라이언트 체크 불필요)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_room_members',
              },
              () => {
                // 사용자가 새 채팅방에 참여 시 목록에 추가
                debouncedRefresh();
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'DELETE',
                schema: 'public',
                table: 'chat_room_members',
              },
              () => {
                // 사용자가 채팅방 탈퇴 시 목록에서 제거
                debouncedRefresh();
              }
            )
            // chat_rooms: 채팅방 정보 변경 감지 (사용자가 참여한 방만)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'chat_rooms',
              },
              () => {
                // 채팅방 정보 변경 시 목록 업데이트
                debouncedRefresh();
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'DELETE',
                schema: 'public',
                table: 'chat_rooms',
              },
              () => {
                // 채팅방 삭제 시 목록에서 제거
                debouncedRefresh();
              }
            )
            // chat_messages: 새 메시지 수신 감지 (사용자가 참여한 방의 메시지만)
            // RLS 정책에 의해 자동으로 필터링됨
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
              },
              (payload) => {
                // 새 메시지 수신 시 배치 처리로 스케줄링
                const newMessage = payload.new as {
                  id?: number;
                  room_id?: number;
                  sender_id?: string;
                  is_read?: boolean;
                  content?: string;
                  content_type?: string;
                  created_at?: string;
                } | null;

                if (newMessage && newMessage.sender_id !== userId) {
                  // 상대방이 보낸 메시지인 경우
                  const messageRoomId = newMessage.room_id;

                  if (messageRoomId) {
                    // 현재 열려있는 채팅방인지 확인
                    const currentRoomIdMatch =
                      pathname?.match(/^\/chat\/(\d+)$/);
                    const currentRoomId = currentRoomIdMatch
                      ? parseInt(currentRoomIdMatch[1], 10)
                      : null;

                    // 현재 열려있는 채팅방이고 상대방 메시지면 즉시 낙관적 읽음 처리
                    const isFromOther = newMessage.sender_id !== user?.id;
                    if (currentRoomId === newMessage.room_id && isFromOther) {
                      // 채팅방이 열려있고 상대방 메시지면 즉시 낙관적 읽음 처리
                      optimisticReadRoomsRef.current.add(newMessage.room_id);
                      // 채팅 목록에서 즉시 unreadCount를 0으로 설정
                      setChatRooms((prev) => {
                        const updated = prev.map((room) => {
                          if (room.room.id === newMessage.room_id) {
                            const lastMessage: ChatMessage | undefined =
                              newMessage.id
                                ? {
                                    id: newMessage.id,
                                    room_id: newMessage.room_id,
                                    sender_id: newMessage.sender_id || '',
                                    content: newMessage.content || null,
                                    content_type:
                                      (newMessage.content_type as
                                        | 'text'
                                        | 'image'
                                        | 'system') || 'text',
                                    created_at:
                                      newMessage.created_at ||
                                      new Date().toISOString(),
                                    is_read: newMessage.is_read || false,
                                  }
                                : undefined;

                            return {
                              ...room,
                              lastMessage,
                              unreadCount: 0, // 즉시 0으로 설정
                            };
                          }
                          return room;
                        });

                        // 최신 메시지 순으로 정렬 (메시지가 없으면 채팅방 생성 시각 사용)
                        updated.sort((a, b) => {
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

                        chatRoomsRef.current = updated;
                        return updated;
                      });
                    } else {
                      // 다른 채팅방이거나 내 메시지면 배치 처리로 스케줄링
                      scheduleMessageUpdate(newMessage);
                    }
                  }
                }

                // 백그라운드에서 최종 동기화 (debounce 적용)
                // 실제 DB 상태와 동기화하기 위해 필요하지만, UI는 이미 업데이트됨
                debouncedRefresh();
              }
            )
            // chat_message_reads: 읽음 처리 감지
            // RLS 정책으로 자동 필터링됨 (클라이언트 체크 불필요)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_message_reads',
              },
              async (payload) => {
                // 메시지 읽음 처리 시 unreadCount 업데이트
                try {
                  const newRead = payload.new as { message_id?: number } | null;
                  const messageId = newRead?.message_id;

                  if (messageId) {
                    // message_id로 room_id 조회 (낙관적 업데이트를 위해)
                    const { data: messageData } = await baseSupabase
                      .from('chat_messages')
                      .select('room_id')
                      .eq('id', messageId)
                      .single();

                    if (messageData?.room_id) {
                      // 실제 읽음 처리가 완료되었으므로 낙관적 업데이트 제거
                      optimisticReadRoomsRef.current.delete(
                        messageData.room_id
                      );
                      // 즉시 낙관적 업데이트 (이미 읽음 처리되었으므로)
                      markRoomAsReadOptimistic(messageData.room_id);
                    }
                  }
                } catch (error) {
                  // 에러 발생 시 기존 방식으로 fallback
                  console.warn('Failed to get room_id from message_id:', error);
                }

                // 백그라운드에서 최종 동기화 (debounce 적용)
                debouncedRefresh();
              }
            )
            .subscribe((status, err) => {
              if (status === 'CHANNEL_ERROR') {
                const errorMessage =
                  'Realtime error: Channel subscription failed';
                console.error(errorMessage, err);
                // Realtime 구독 실패해도 앱은 정상 동작 (폴링으로 대체)
                if (channelRef.current === channel) {
                  channelRef.current = null;
                  subscribedUserIdRef.current = null;
                }
              } else if (status === 'TIMED_OUT') {
                console.warn('⚠️ Realtime subscription timed out');
                // 타임아웃 시 재시도하지 않음 (폴링으로 대체)
                if (channelRef.current === channel) {
                  channelRef.current = null;
                  subscribedUserIdRef.current = null;
                }
              } else if (status === 'CLOSED') {
                if (channelRef.current === channel) {
                  channelRef.current = null;
                  subscribedUserIdRef.current = null;
                }
              }
            });

          channelRef.current = channel;
          subscribedUserIdRef.current = userId;
        } catch (err) {
          const errorMessage = `Realtime error: Failed to setup postgres_changes subscription: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`;
          console.error(errorMessage, err);
          // Realtime 구독 실패해도 앱은 정상 동작 (폴링으로 대체)
          cleanupChannel();
        }
      };

      await setupRealtimeSubscription();
    },
    [
      cleanupChannel,
      debouncedRefresh,
      markRoomAsReadOptimistic,
      pathname,
      scheduleMessageUpdate,
      user?.id,
      optimisticReadRoomsRef,
      chatRoomsRef,
      setChatRooms,
      messageUpdateTimerRef,
      pendingMessageUpdatesRef,
    ]
  );

  return {
    subscribeToPostgresChanges,
    cleanupChannel,
    channelRef,
  };
};

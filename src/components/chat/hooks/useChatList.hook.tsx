'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';

import { supabase as baseSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import { getEffectiveStatus } from '@/stores/user-status.store';
import { getAvatarImagePath } from '@/lib/avatar/getAvatarImagePath';
import type { ChatRoomListItem } from '@/repositories/chat.repository';
import type { ChatRoom, ChatMessage, UserProfile } from '@/types/chat';

/**
 * 간단한 debounce 함수
 */
const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

/**
 * 시간 포맷 함수 (24h 기준, 오늘은 시간, 그 외는 날짜)
 */
const formatMessageTime = (dateString: string | null): string => {
  if (!dateString) {
    return '';
  }

  const messageDate = new Date(dateString);
  const now = new Date();
  const isToday =
    messageDate.getDate() === now.getDate() &&
    messageDate.getMonth() === now.getMonth() &&
    messageDate.getFullYear() === now.getFullYear();

  if (isToday) {
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) {
      return '방금 전';
    }
    if (diffMins < 60) {
      return `${diffMins}분 전`;
    }
    if (diffHours < 24) {
      return `${diffHours}시간 전`;
    }
  }

  const month = messageDate.getMonth() + 1;
  const day = messageDate.getDate();
  return `${month}월 ${day}일`;
};

/**
 * 메시지 내용 포맷 함수
 */
const formatMessageContent = (message: ChatMessage | undefined): string => {
  if (!message) {
    return '메시지가 없습니다';
  }

  const contentType = message.content_type;
  if (contentType === 'image') {
    return '📷 이미지';
  }
  if (contentType === 'system') {
    return message.content || '시스템 메시지';
  }
  return message.content || '메시지가 없습니다';
};

/**
 * 채팅방 이름 생성 함수
 */
const getChatRoomName = (room: ChatRoom, otherMember?: UserProfile): string => {
  const roomType = room.type ?? 'direct';

  if (roomType === 'group') {
    return '그룹 채팅';
  }

  // 1:1 채팅인 경우
  if (otherMember?.nickname) {
    return otherMember.nickname;
  }

  return '알 수 없음';
};

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
 * - 채팅방 목록 조회 (API)
 * - postgres_changes로 목록 실시간 업데이트
 * - 읽지 않은 메시지 수 표시 관리
 * - 자동 새로고침 (선택사항)
 */
export const useChatList = (props?: UseChatListProps): UseChatListReturn => {
  const { autoRefresh = true, refreshInterval = 30000 } = props || {};
  const { user } = useAuth();
  const pathname = usePathname();

  // 상태 관리
  const [chatRooms, setChatRooms] = useState<ChatRoomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // postgres_changes 채널 관리
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedUserIdRef = useRef<string | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const optimisticReadRoomsRef = useRef<Set<number>>(new Set()); // 낙관적으로 읽음 처리된 채팅방 ID들
  const chatRoomsRef = useRef<ChatRoomListItem[]>([]); // 최신 chatRooms 상태 추적용 ref
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
  >(new Map()); // 배치 처리용 대기 중인 메시지 업데이트
  const messageUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [user?.id, pathname]);

  /**
   * 낙관적 업데이트: 특정 채팅방의 unreadCount를 즉시 0으로 설정
   */
  const markRoomAsReadOptimistic = useCallback((roomId: number) => {
    if (!isMountedRef.current) {
      return;
    }

    // 낙관적으로 읽음 처리된 채팅방 ID 저장
    optimisticReadRoomsRef.current.add(roomId);

    setChatRooms((prev) => {
      const updated = prev.map((room) =>
        room.room.id === roomId ? { ...room, unreadCount: 0 } : room
      );
      chatRoomsRef.current = updated; // ref 업데이트
      return updated;
    });
  }, []);

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
    []
  );

  /**
   * debounced refresh 함수 (필수에 가까운 권장)
   */
  const debouncedRefresh = useMemo(
    () =>
      debounce((...args: Parameters<typeof refresh>) => {
        refresh(...args);
      }, 300),
    [refresh]
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
        // 낙관적 읽음 처리 유지
        if (optimisticReadRoomsRef.current.has(roomId)) {
          // 이미 낙관적 읽음 처리되어 있으면 유지
        }
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
  }, [pathname, user?.id]);

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
  }, []);

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
    ]
  );

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
  }, [cleanupChannel]);

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

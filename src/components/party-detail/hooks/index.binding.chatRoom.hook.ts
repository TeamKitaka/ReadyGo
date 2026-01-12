'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import React from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { supabase as baseSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import { getAvatarImagePath } from '@/lib/avatar/getAvatarImagePath';

// 타입 정의
type PartyMessage = Database['public']['Tables']['party_messages']['Row'];
type PartyMember = Database['public']['Tables']['party_members']['Row'];
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

/**
 * 포맷된 메시지 아이템 타입
 */
export interface FormattedMessageItem {
  type: 'date-divider' | 'message';
  date?: string | null; // date-divider인 경우
  formattedDate?: string; // date-divider인 경우 (포맷팅된 날짜)
  message?: PartyMessage; // message인 경우
  isConsecutive?: boolean; // message인 경우
  isOwnMessage?: boolean; // message인 경우
  formattedTime?: string; // message인 경우
  formattedContent?: string; // message인 경우
  senderNickname?: string; // message인 경우, 파티 멤버에서 조회
  senderAvatarImagePath?: string; // message인 경우, 파티 멤버에서 조회
  senderAnimalType?: string; // message인 경우, 파티 멤버에서 조회
}

/**
 * 파티 멤버 프로필 정보 타입 (내부 사용)
 */
interface PartyMemberProfile {
  userId: string;
  nickname: string;
  avatarImagePath: string;
  animalType?: string;
}

/**
 * Hook 파라미터 타입
 */
export interface UseChatRoomProps {
  postId: number; // 필수: 파티 ID
}

/**
 * Hook 반환 타입
 */
export interface UseChatRoomReturn {
  formattedMessages: FormattedMessageItem[]; // UI에서 바로 사용 가능한 포맷된 메시지 배열
  messages: PartyMessage[]; // 원본 메시지 배열 (게임 링크 미리보기용)
  isBlocked: boolean; // 차단 상태, 기본값 false
  sendMessage: (content: string, contentType?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  scrollToBottom: (containerRef: React.RefObject<HTMLDivElement>) => void;
  shouldShowScrollToBottomButton: (
    containerRef: React.RefObject<HTMLDivElement>
  ) => boolean;
  shouldScrollToBottom: boolean;
  clearScrollTriggers: () => void;
  setMessageListContainerRef: (ref: React.RefObject<HTMLDivElement>) => void;
}

/**
 * 메시지 시간 포맷팅 함수
 */
const formatMessageTime = (dateString: string | null): string => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? '오후' : '오전';
  const displayHours = hours % 12 || 12;
  const timeString = `${ampm} ${displayHours}:${minutes
    .toString()
    .padStart(2, '0')}`;

  return timeString;
};

/**
 * 날짜 구분선 포맷팅 함수
 */
const formatDateDivider = (dateString: string | null): string => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  const weekdays = [
    '일요일',
    '월요일',
    '화요일',
    '수요일',
    '목요일',
    '금요일',
    '토요일',
  ];
  const weekday = weekdays[date.getDay()];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}`;
};

/**
 * 날짜가 변경되었는지 확인하는 함수
 */
const isNewDate = (
  currentDate: string | null,
  previousDate: string | null
): boolean => {
  if (!currentDate || !previousDate) {
    return true;
  }

  const current = new Date(currentDate);
  const previous = new Date(previousDate);

  return (
    current.getFullYear() !== previous.getFullYear() ||
    current.getMonth() !== previous.getMonth() ||
    current.getDate() !== previous.getDate()
  );
};

/**
 * 연속된 메시지인지 확인하는 함수
 */
const isConsecutiveMessage = (
  currentMessage: PartyMessage,
  previousMessage: PartyMessage | null
): boolean => {
  if (!previousMessage) {
    return false;
  }
  // sender_id만 비교 (content_type은 연속 메시지 판단에 사용하지 않음)
  return currentMessage.sender_id === previousMessage.sender_id;
};

/**
 * 메시지 내용 포맷팅 함수
 */
const formatMessageContent = (message: PartyMessage | null): string => {
  if (!message) {
    return '메시지가 없습니다';
  }

  const { content } = message;

  if (content === null) {
    return '메시지가 없습니다';
  }

  // content 그대로 반환 (content_type은 UI에서 별도로 처리)
  return content;
};

/**
 * useChatRoom Hook (파티 채팅방용)
 *
 * - 초기 메시지 로드 (getPartyMessagesService)
 * - postgres_changes로 party_messages 테이블의 INSERT 이벤트 구독
 * - 메시지 전송 플로우 (sendPartyMessageService)
 * - 메시지 그룹화 및 포맷팅
 * - 파티 멤버 정보 조회 및 포맷팅
 */
export const useChatRoom = (props: UseChatRoomProps): UseChatRoomReturn => {
  const { postId } = props;
  const { user } = useAuth();

  // 상태 관리
  const [messages, setMessages] = useState<PartyMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partyMemberProfiles, setPartyMemberProfiles] = useState<
    Map<string, PartyMemberProfile>
  >(new Map());

  // postgres_changes 채널 관리
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedPostIdRef = useRef<number | null>(null);
  const seenMessageIdsRef = useRef<Set<number>>(new Set());
  const isSendingRef = useRef(false); // 중복 전송 방지

  // 스크롤 관련 상태 및 ref
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const messageListContainerRef =
    useRef<React.RefObject<HTMLDivElement> | null>(null);
  const shouldAutoScrollRef = useRef(true); // 자동 스크롤 여부 (사용자가 수동 스크롤 시 false)
  const isInitialLoadRef = useRef(false); // 초기 로드 플래그

  /**
   * 최하단으로 스크롤
   */
  const scrollToBottom = useCallback(
    (containerRef: React.RefObject<HTMLDivElement>) => {
      if (!containerRef.current) {
        return;
      }

      // DOM 렌더링 완료 후 스크롤
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      });
    },
    []
  );

  /**
   * 최하단 이동 버튼 표시 여부 확인
   * 스크롤이 전체 길이의 50% 이상 올라갔을 때만 표시
   */
  const shouldShowScrollToBottomButton = useCallback(
    (containerRef: React.RefObject<HTMLDivElement>): boolean => {
      if (!containerRef.current) {
        return false;
      }

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

      // 스크롤 가능한 전체 높이 계산
      const scrollableHeight = scrollHeight - clientHeight;

      // 스크롤 가능한 높이가 없으면 버튼 표시 안 함 (모든 메시지가 화면에 보임)
      if (scrollableHeight <= 0) {
        return false;
      }

      // 현재 스크롤 위치가 하단에서 얼마나 떨어져 있는지 계산
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      // 하단까지의 거리가 전체 스크롤 가능한 높이의 50% 이상일 때만 버튼 표시
      const threshold = scrollableHeight * 0.5;
      return distanceFromBottom > threshold;
    },
    []
  );

  /**
   * 스크롤이 최하단에 있는지 확인
   */
  const isAtBottom = useCallback(
    (containerRef: React.RefObject<HTMLDivElement>): boolean => {
      if (!containerRef.current) {
        return false;
      }

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

      // 스크롤 가능한 전체 높이 계산
      const scrollableHeight = scrollHeight - clientHeight;

      // 스크롤 가능한 높이가 없으면 최하단으로 간주
      if (scrollableHeight <= 0) {
        return true;
      }

      // 현재 스크롤 위치가 하단에서 얼마나 떨어져 있는지 계산
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      // 하단까지의 거리가 50px 이하이면 최하단으로 간주
      return distanceFromBottom <= 50;
    },
    []
  );

  /**
   * 스크롤 트리거 초기화
   */
  const clearScrollTriggers = useCallback(() => {
    setShouldScrollToBottom(false);
  }, []);

  /**
   * 메시지 리스트 컨테이너 ref 설정
   */
  const setMessageListContainerRef = useCallback(
    (ref: React.RefObject<HTMLDivElement>) => {
      messageListContainerRef.current = ref;
    },
    []
  );

  /**
   * 새 메시지 처리 (중복 제거 포함)
   */
  const handleNewMessage = useCallback(
    (message: PartyMessage) => {
      // 중복 체크 (Set 기반)
      if (seenMessageIdsRef.current.has(message.id)) {
        return;
      }
      seenMessageIdsRef.current.add(message.id);

      // 자신이 보낸 메시지이거나 사용자가 최하단에 있을 때 자동 스크롤
      if (message.sender_id === user?.id) {
        shouldAutoScrollRef.current = true;
        setShouldScrollToBottom(true);
      } else if (shouldAutoScrollRef.current) {
        // 상대방 메시지이고 자동 스크롤이 활성화되어 있으면 최하단 스크롤
        if (messageListContainerRef.current?.current) {
          if (isAtBottom(messageListContainerRef.current)) {
            setShouldScrollToBottom(true);
          } else {
            // 사용자가 위로 스크롤한 경우 자동 스크롤 비활성화
            shouldAutoScrollRef.current = false;
          }
        }
      }

      setMessages((prev) => {
        // 이미 존재하는지 다시 확인 (race condition 방지)
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }

        // created_at 기준으로 정렬된 위치에 삽입
        const newMessages = [...prev, message];
        return newMessages.sort((a, b) => {
          const aTime = a.created_at || '';
          const bTime = b.created_at || '';
          return aTime.localeCompare(bTime);
        });
      });
    },
    [user?.id, isAtBottom]
  );

  /**
   * postgres_changes 채널 정리 함수
   */
  const cleanupChannel = useCallback(() => {
    const channel = channelRef.current;
    if (channel) {
      // 채널 참조를 먼저 null로 설정하여 중복 호출 방지
      channelRef.current = null;
      subscribedPostIdRef.current = null;
      // 채널 제거
      try {
        baseSupabase.removeChannel(channel);
      } catch (error) {
        // 이미 제거된 채널이거나 에러가 발생해도 무시
        console.warn(
          'Failed to remove channel (may already be removed):',
          error
        );
      }
    } else {
      // 채널이 없으면 subscribedPostIdRef만 초기화
      subscribedPostIdRef.current = null;
    }
  }, []);

  /**
   * 메시지 발신자 프로필 정보 조회 (파티를 떠난 멤버 포함)
   */
  const loadMessageSenderProfiles = useCallback(async (senderIds: string[]) => {
    if (senderIds.length === 0) {
      return;
    }

    try {
      // 고유한 sender_id만 필터링
      const uniqueSenderIds = Array.from(new Set(senderIds.filter(Boolean)));

      if (uniqueSenderIds.length === 0) {
        return;
      }

      // Supabase 클라이언트를 사용하여 프로필 정보 조회
      const { data: profiles, error } = await baseSupabase
        .from('user_profiles')
        .select('id, nickname, avatar_url, animal_type')
        .in('id', uniqueSenderIds);

      if (error) {
        console.error('Failed to load message sender profiles:', error);
        return;
      }

      // 기존 프로필 Map에 추가 (기존 프로필은 유지)
      setPartyMemberProfiles((prev) => {
        const newMap = new Map(prev);

        (profiles || []).forEach((profile) => {
          if (!profile.id) {
            return;
          }

          // 이미 존재하는 프로필이면 업데이트하지 않음 (파티 멤버 프로필 우선)
          if (newMap.has(profile.id)) {
            return;
          }

          const avatarImagePath = getAvatarImagePath(
            profile.avatar_url,
            profile.animal_type
          );

          newMap.set(profile.id, {
            userId: profile.id,
            nickname: profile.nickname || '알 수 없음',
            avatarImagePath,
            animalType: profile.animal_type || undefined,
          });
        });

        return newMap;
      });
    } catch (error) {
      console.error('Failed to load message sender profiles:', error);
    }
  }, []);

  /**
   * 파티 멤버 프로필 정보 조회
   */
  const loadPartyMemberProfiles = useCallback(async (targetPostId: number) => {
    // postId가 유효하지 않으면 early return
    if (!targetPostId || targetPostId <= 0) {
      setPartyMemberProfiles(new Map());
      return;
    }

    try {
      // API를 통해 파티 멤버 및 프로필 조회
      const response = await fetch(`/api/party/${targetPostId}/members`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('파티 멤버 조회에 실패했습니다.');
      }

      const data = await response.json();
      const { members, profiles } = data;

      // profiles 배열을 Map으로 변환
      const profileMap = new Map<string, PartyMemberProfile>();
      const profilesMap = new Map<string, UserProfile>(
        (profiles || []).map((profile: UserProfile) => [profile.id, profile])
      );

      (members || []).forEach((member: PartyMember) => {
        if (!member.user_id) {
          return;
        }

        const profile = profilesMap.get(member.user_id);
        const avatarImagePath = getAvatarImagePath(
          profile?.avatar_url,
          profile?.animal_type
        );

        profileMap.set(member.user_id, {
          userId: member.user_id,
          nickname: profile?.nickname || '알 수 없음',
          avatarImagePath,
          animalType: profile?.animal_type || undefined,
        });
      });

      setPartyMemberProfiles(profileMap);
    } catch (error) {
      console.error('Failed to load party member profiles:', error);
      // 에러 발생 시 빈 Map 사용
      setPartyMemberProfiles(new Map());
    }
  }, []);

  /**
   * 초기 메시지 로드 (API)
   */
  const loadMessages = useCallback(
    async (targetPostId: number) => {
      // postId가 유효하지 않으면 early return
      if (!targetPostId || targetPostId <= 0) {
        setIsLoading(false);
        setMessages([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/party/${targetPostId}/messages?limit=50&offset=0`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || '메시지 로드에 실패했습니다.');
        }

        const result = await response.json();
        const loadedMessages: PartyMessage[] = result.data || [];

        // Repository는 내림차순(최신→과거)으로 반환하므로 reverse 처리 (과거→최신)
        const reversedMessages = [...loadedMessages].reverse();

        // seenMessageIds 초기화 및 업데이트
        seenMessageIdsRef.current = new Set(reversedMessages.map((m) => m.id));

        setMessages(reversedMessages);

        // 메시지 발신자 프로필 정보 조회 (파티를 떠난 멤버 포함)
        const senderIds = reversedMessages
          .map((m) => m.sender_id)
          .filter((id): id is string => !!id);
        if (senderIds.length > 0) {
          loadMessageSenderProfiles(senderIds).catch((error) => {
            console.error(
              'Failed to load message sender profiles after loading messages:',
              error
            );
          });
        }

        // 초기 로드 완료 후 최하단 스크롤 트리거
        isInitialLoadRef.current = false;
        setShouldScrollToBottom(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '메시지 로드에 실패했습니다.';
        setError(errorMessage);
        console.error('Failed to load messages:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [loadMessageSenderProfiles]
  );

  /**
   * postgres_changes 구독
   */
  const subscribeToPostgresChanges = useCallback(
    async (targetPostId: number) => {
      // postId가 유효하지 않으면 early return
      if (!targetPostId || targetPostId <= 0) {
        cleanupChannel();
        return;
      }

      // user.id가 없으면 구독하지 않음
      if (!user?.id) {
        cleanupChannel();
        return;
      }

      // 중복 구독 방지
      if (subscribedPostIdRef.current === targetPostId && channelRef.current) {
        return;
      }

      // 기존 채널 정리
      if (channelRef.current) {
        const oldChannel = channelRef.current;
        // 참조를 먼저 null로 설정
        channelRef.current = null;
        subscribedPostIdRef.current = null;
        // 채널 제거
        try {
          baseSupabase.removeChannel(oldChannel);
        } catch (error) {
          // 이미 제거된 채널이거나 에러가 발생해도 무시
          console.warn('Failed to remove old channel:', error);
        }
      }

      try {
        // postgres_changes 채널 생성
        const channel = baseSupabase
          .channel(`party:${targetPostId}:messages`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'party_messages',
              filter: `post_id=eq.${targetPostId}`,
            },
            async (payload) => {
              try {
                // payload.new는 이미 PartyMessage 타입
                const newMessage = payload.new as PartyMessage;

                // 발신자 프로필이 없으면 프로필 정보 조회
                if (
                  newMessage.sender_id &&
                  !partyMemberProfiles.get(newMessage.sender_id)
                ) {
                  // 프로필 정보 조회 (비동기로 실행, 블로킹하지 않음)
                  loadMessageSenderProfiles([newMessage.sender_id]).catch(
                    (error) => {
                      console.error(
                        'Failed to load sender profile after new message:',
                        error
                      );
                    }
                  );
                }

                // 중복 체크 및 메시지 추가
                handleNewMessage(newMessage);
              } catch (error) {
                console.error(
                  'Error processing postgres_changes event:',
                  error
                );
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'party_members',
              filter: `post_id=eq.${targetPostId}`,
            },
            async (payload) => {
              try {
                // 새 멤버가 추가되면 프로필 정보 갱신
                // eslint-disable-next-line no-console
                console.log('Party member INSERT event received:', payload);
                await loadPartyMemberProfiles(targetPostId);
              } catch (error) {
                console.error(
                  'Failed to refresh member profiles after member insert:',
                  error
                );
              }
            }
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              const errorMessage = 'Postgres changes channel error occurred';
              setError(errorMessage);
              console.error('Channel error:', errorMessage);
              // cleanupChannel을 호출하지 않고, 채널 참조만 정리
              if (channelRef.current === channel) {
                channelRef.current = null;
                subscribedPostIdRef.current = null;
              }
            } else if (status === 'CLOSED') {
              // CLOSED 상태는 이미 채널이 닫힌 상태이므로 cleanupChannel을 호출하지 않음
              if (channelRef.current === channel) {
                channelRef.current = null;
                subscribedPostIdRef.current = null;
              }
            }
          });

        channelRef.current = channel;
        subscribedPostIdRef.current = targetPostId;
      } catch (error) {
        console.error('Failed to setup postgres_changes subscription:', error);
        setError('구독 설정에 실패했습니다.');
        cleanupChannel();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      user?.id,
      cleanupChannel,
      loadPartyMemberProfiles,
      loadMessageSenderProfiles,
      partyMemberProfiles,
    ]
  );

  /**
   * 메시지 전송
   */
  const sendMessage = useCallback(
    async (content: string, contentType: string = 'text'): Promise<void> => {
      // 중복 전송 방지
      if (isSendingRef.current) {
        console.warn(
          '[useChatRoom] Message is already being sent, ignoring duplicate request'
        );
        return;
      }

      // postId가 유효하지 않으면 에러
      if (!postId || postId <= 0) {
        throw new Error('유효한 파티가 선택되지 않았습니다.');
      }

      if (!user?.id) {
        throw new Error('로그인이 필요합니다.');
      }

      // 전송 시작
      isSendingRef.current = true;

      try {
        const response = await fetch(`/api/party/${postId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            content,
            contentType,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || '메시지 전송에 실패했습니다.');
        }

        // postgres_changes 구독이 자동으로 메시지를 추가하므로
        // 여기서는 로컬 상태에 추가하지 않음 (중복 방지)
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : '메시지 전송에 실패했습니다.';
        setError(errorMessage);
        console.error('[useChatRoom] Failed to send message:', error);
        throw error;
      } finally {
        // 전송 완료
        isSendingRef.current = false;
      }
    },
    [postId, user?.id]
  );

  /**
   * postId 또는 user?.id 변경 시 자동 처리
   */
  useEffect(() => {
    // postId가 유효하지 않으면 early return
    if (!postId || postId <= 0) {
      cleanupChannel();
      setMessages([]);
      seenMessageIdsRef.current.clear();
      setPartyMemberProfiles(new Map());
      setIsLoading(false);
      setError(null);
      return;
    }

    // user?.id가 없으면 채널 정리만 수행
    if (!user?.id) {
      cleanupChannel();
      setMessages([]);
      seenMessageIdsRef.current.clear();
      setPartyMemberProfiles(new Map());
      setIsLoading(false);
      setError(null);
      return;
    }

    // 이전 채널 정리
    cleanupChannel();
    // messages 배열 초기화
    setMessages([]);
    seenMessageIdsRef.current.clear();
    // isLoading 리셋
    setIsLoading(true);
    // error 상태 초기화
    setError(null);
    // 스크롤 관련 상태 초기화
    isInitialLoadRef.current = false;
    shouldAutoScrollRef.current = true;
    setShouldScrollToBottom(false);

    // 파티 멤버 프로필 정보와 메시지를 모두 로드한 후 구독 시작
    // 이렇게 하면 새 메시지가 도착하기 전에 프로필 정보가 준비되어
    // "알 수 없음"으로 표시되는 문제를 방지할 수 있습니다
    Promise.all([loadPartyMemberProfiles(postId), loadMessages(postId)]).then(
      () => {
        // postgres_changes 구독
        subscribeToPostgresChanges(postId);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, user?.id]);

  /**
   * 컴포넌트 언마운트 시 cleanup
   */
  useEffect(() => {
    return () => {
      // postgres_changes 채널 정리
      cleanupChannel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 중복 제거 및 정렬된 메시지 목록 (useMemo)
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
   * 포맷된 메시지 목록 생성 (날짜 구분선, 연속 메시지, 포맷팅 포함)
   */
  const formattedMessages = useMemo<FormattedMessageItem[]>(() => {
    // postId가 유효하지 않거나 user가 없으면 빈 배열 반환
    if (!postId || postId <= 0 || !user?.id) {
      return [];
    }

    const result: FormattedMessageItem[] = [];

    sortedMessages.forEach((message, index) => {
      const previousMessage = index > 0 ? sortedMessages[index - 1] : null;

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
      // 시스템 메시지는 항상 연속 메시지가 아님
      const isSystemMessage = message.content_type === 'system';
      const isConsecutive = isSystemMessage
        ? false
        : isConsecutiveMessage(message, previousMessage);
      const isOwnMessage = message.sender_id === user.id;
      const formattedTime = formatMessageTime(message.created_at);
      const formattedContent = formatMessageContent(message);

      // 발신자 정보 조회 (시스템 메시지는 sender_id가 null이므로 undefined)
      const senderProfile = message.sender_id
        ? partyMemberProfiles.get(message.sender_id)
        : undefined;

      result.push({
        type: 'message',
        message,
        isConsecutive,
        isOwnMessage,
        formattedTime,
        formattedContent,
        senderNickname: senderProfile?.nickname || '알 수 없음',
        senderAvatarImagePath:
          senderProfile?.avatarImagePath || getAvatarImagePath(null, null),
        senderAnimalType: senderProfile?.animalType,
      });
    });

    return result;
  }, [sortedMessages, user?.id, postId, partyMemberProfiles]);

  /**
   * 차단 상태 확인 (기본값 false)
   */
  const isBlocked = useMemo<boolean>(() => {
    // postId가 유효하지 않거나 user가 없으면 false
    if (!postId || postId <= 0 || !user?.id) {
      return false;
    }

    // TODO: API를 통해 차단 상태 확인
    // 현재는 기본값 false 반환
    return false;
  }, [postId, user?.id]);

  return {
    formattedMessages,
    messages: sortedMessages,
    isBlocked,
    sendMessage,
    isLoading,
    error,
    scrollToBottom,
    shouldShowScrollToBottomButton,
    shouldScrollToBottom,
    clearScrollTriggers,
    setMessageListContainerRef,
  };
};

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useModal } from '@/commons/providers/modal/modal.provider';
import { supabase as baseSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook 파라미터 타입
 */
export interface UseChatRoomInputProps {
  sendMessage: (content: string, contentType?: string) => Promise<void>;
  isBlocked: boolean;
  otherMemberNickname?: string;
  roomId: number;
  otherMemberId?: string;
}

/**
 * Hook 반환 타입
 */
export interface UseChatRoomInputReturn {
  messageInput: string;
  setMessageInput: (value: string) => void;
  handleSendMessage: () => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleGameStart: () => void;
  timerCount: number | null;
  isTimerActive: boolean;
  setTimerEndCallback: (callback: () => void) => void;
}

/**
 * 채팅방 입력 관련 로직을 관리하는 Hook
 *
 * - 메시지 입력 상태 관리
 * - 메시지 전송 처리
 * - Enter 키 입력 처리
 * - 게임시작 타이머 처리
 */
export const useChatRoomInput = (
  props: UseChatRoomInputProps
): UseChatRoomInputReturn => {
  const { sendMessage, isBlocked, otherMemberNickname, roomId, otherMemberId } =
    props;
  const { openModal } = useModal();
  const { user } = useAuth();

  // 메시지 입력 상태
  const [messageInput, setMessageInput] = useState('');
  const isSendingRef = useRef(false); // 전송 중 상태 (중복 전송 방지)

  // 타이머 상태
  const [timerCount, setTimerCount] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameStartChannelRef = useRef<RealtimeChannel | null>(null);
  const timerEndCallbackRef = useRef<(() => void) | null>(null);

  // 메시지 전송 핸들러
  const handleSendMessage = useCallback(async () => {
    // 중복 전송 방지
    if (isSendingRef.current) {
      return;
    }

    if (!messageInput.trim() || isBlocked) {
      return;
    }

    // 전송 시작
    isSendingRef.current = true;

    try {
      await sendMessage(messageInput.trim(), 'text');
      setMessageInput(''); // 전송 성공 시 입력 초기화
    } catch (err) {
      console.error('Failed to send message:', err);
      // 에러 발생 시 messageInput은 그대로 유지하여 재전송 가능
    } finally {
      // 전송 완료
      isSendingRef.current = false;
    }
  }, [messageInput, isBlocked, sendMessage]);

  // Enter 키 입력 시 전송
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // 타이머 종료 콜백 설정
  const setTimerEndCallback = useCallback((callback: () => void) => {
    timerEndCallbackRef.current = callback;
  }, []);

  // 타이머 시작
  const startTimer = useCallback(() => {
    // 이미 타이머가 실행 중이면 무시
    if (timerIntervalRef.current) {
      return;
    }

    setIsTimerActive(true);
    setTimerCount(30);

    // Broadcast로 게임 시작 이벤트 전송
    if (gameStartChannelRef.current && user?.id) {
      gameStartChannelRef.current
        .send({
          type: 'broadcast',
          event: 'game_start',
          payload: {
            roomId,
            senderId: user.id,
            timestamp: Date.now(),
          },
        })
        .catch((error) => {
          console.error('Failed to broadcast game start event:', error);
        });
    }

    // 타이머 카운트다운
    timerIntervalRef.current = setInterval(() => {
      setTimerCount((prev) => {
        if (prev === null || prev <= 1) {
          // 타이머 종료
          setIsTimerActive(false);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }

          // Broadcast로 타이머 종료 이벤트 전송
          if (gameStartChannelRef.current && user?.id) {
            gameStartChannelRef.current
              .send({
                type: 'broadcast',
                event: 'timer_end',
                payload: {
                  roomId,
                  senderId: user.id,
                  timestamp: Date.now(),
                },
              })
              .catch((error) => {
                console.error('Failed to broadcast timer end event:', error);
              });
          }

          // 타이머 종료 콜백 호출
          if (timerEndCallbackRef.current) {
            timerEndCallbackRef.current();
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [roomId, user?.id]);

  // 게임 시작 이벤트 수신 처리
  useEffect(() => {
    if (!roomId || roomId <= 0 || !user?.id) {
      return;
    }

    // Broadcast 채널 구독
    const channel = baseSupabase
      .channel(`chat:${roomId}:game`, {
        config: {
          broadcast: { self: false }, // 자기가 보낸 이벤트는 받지 않음
        },
      })
      .on('broadcast', { event: 'game_start' }, (payload) => {
        // 게임 시작 이벤트 수신 시 타이머 시작
        if (payload.payload.roomId === roomId) {
          startTimer();
        }
      })
      .on('broadcast', { event: 'timer_end' }, (payload) => {
        // 타이머 종료 이벤트 수신 시 후기 모달 표시
        if (payload.payload.roomId === roomId) {
          if (timerEndCallbackRef.current) {
            timerEndCallbackRef.current();
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          gameStartChannelRef.current = channel;
        }
      });

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (gameStartChannelRef.current) {
        baseSupabase.removeChannel(gameStartChannelRef.current);
        gameStartChannelRef.current = null;
      }
      setIsTimerActive(false);
      setTimerCount(null);
    };
  }, [roomId, user?.id, startTimer]);

  // 게임시작 버튼 클릭 핸들러
  const handleGameStart = useCallback(() => {
    if (!otherMemberNickname || !otherMemberId) {
      return;
    }

    // 확인 모달 표시
    openModal({
      variant: 'dual',
      title: '게임 시작',
      description: `${otherMemberNickname}님과 게임을 시작하시겠습니까?`,
      confirmText: '확인',
      cancelText: '취소',
      onConfirm: () => {
        // 확인 버튼 클릭 시 타이머 시작
        startTimer();
      },
      onCancel: () => {
        // 취소 버튼 클릭 시 모달만 닫기
      },
    });
  }, [otherMemberNickname, otherMemberId, startTimer, openModal]);

  return {
    messageInput,
    setMessageInput,
    handleSendMessage,
    handleKeyDown,
    handleGameStart,
    timerCount,
    isTimerActive,
    setTimerEndCallback,
  };
};

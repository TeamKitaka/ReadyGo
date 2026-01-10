'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase as baseSupabase } from '@/lib/supabase/client';

export type SteamGame = {
  app_id: number;
  name: string;
};

export interface UseGameStartTimerReturn {
  game: SteamGame | null;
  isTimerActive: boolean;
  timeRemaining: number;
  timerEnded: boolean; // 타이머 종료 여부
  startGameTimer: (
    game: SteamGame,
    roomId: number,
    otherUserId: string
  ) => void;
  stopTimer: () => void;
  resetTimerEnded: () => void; // 타이머 종료 상태 리셋
}

const TIMER_DURATION = 15; // 15초

/**
 * 게임 시작 타이머 훅
 *
 * 책임:
 * - 게임 시작 상태 관리
 * - 15초 타이머 로직
 * - Realtime을 통한 양쪽 사용자 동기화
 * - 타이머 종료 시 콜백 호출
 */
export const useGameStartTimer = (): UseGameStartTimerReturn => {
  const [game, setGame] = useState<SteamGame | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(TIMER_DURATION);
  const [timerEnded, setTimerEnded] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const roomIdRef = useRef<number | null>(null);

  /**
   * 타이머 종료 상태 리셋
   */
  const resetTimerEnded = useCallback(() => {
    setTimerEnded(false);
  }, []);

  /**
   * 채널 정리
   */
  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      baseSupabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    roomIdRef.current = null;
  }, []);

  /**
   * 타이머 정리
   */
  const cleanupTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * 타이머 중지
   */
  const stopTimer = useCallback(() => {
    cleanupTimer();
    setIsTimerActive(false);
    setTimeRemaining(TIMER_DURATION);
    setGame(null);
    cleanupChannel();
    setTimerEnded(false);
  }, [cleanupTimer, cleanupChannel]);

  /**
   * 게임 시작 및 타이머 시작
   */
  const startGameTimer = useCallback(
    (selectedGame: SteamGame, roomId: number, _otherUserId: string) => {
      // 기존 타이머 정리
      stopTimer();

      setGame(selectedGame);
      setIsTimerActive(true);
      setTimeRemaining(TIMER_DURATION);
      roomIdRef.current = roomId;

      // Realtime 채널 설정
      const channelName = `game-start:${roomId}`;
      const channel = baseSupabase
        .channel(channelName, {
          config: {
            broadcast: { self: true }, // 자신도 이벤트 수신
          },
        })
        .on('broadcast', { event: 'game_started' }, (payload) => {
          // 다른 사용자가 게임 시작한 경우 동기화
          const { game: receivedGame } = payload.payload as {
            game: SteamGame;
          };
          if (receivedGame && !game) {
            setGame(receivedGame);
            setIsTimerActive(true);
            setTimeRemaining(TIMER_DURATION);
          }
        })
        .on('broadcast', { event: 'timer_started' }, (payload) => {
          // 타이머 시작 동기화
          const { startTime } = payload.payload as { startTime: number };
          if (startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, TIMER_DURATION - elapsed);
            setTimeRemaining(remaining);
            setIsTimerActive(true);
          }
        })
        .on('broadcast', { event: 'timer_ended' }, () => {
          // 타이머 종료 동기화
          cleanupTimer();
          setIsTimerActive(false);
          setTimerEnded(true);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // 게임 시작 이벤트 브로드캐스트
            channel.send({
              type: 'broadcast',
              event: 'game_started',
              payload: { game: selectedGame },
            });

            // 타이머 시작 이벤트 브로드캐스트
            const startTime = Date.now();
            channel.send({
              type: 'broadcast',
              event: 'timer_started',
              payload: { startTime },
            });

            // 로컬 타이머 시작
            setTimeRemaining(TIMER_DURATION);
            let remaining = TIMER_DURATION;

            intervalRef.current = setInterval(() => {
              remaining -= 1;
              setTimeRemaining(remaining);

              if (remaining <= 0) {
                cleanupTimer();
                setIsTimerActive(false);
                setTimerEnded(true);

                // 타이머 종료 이벤트 브로드캐스트
                channel.send({
                  type: 'broadcast',
                  event: 'timer_ended',
                  payload: {},
                });
              }
            }, 1000);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Game start timer channel error');
            stopTimer();
          }
        });

      channelRef.current = channel;
    },
    [game, stopTimer, cleanupTimer]
  );

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanupTimer();
      cleanupChannel();
    };
  }, [cleanupTimer, cleanupChannel]);

  return {
    game,
    isTimerActive,
    timeRemaining,
    timerEnded,
    startGameTimer,
    stopTimer,
    resetTimerEnded,
  };
};

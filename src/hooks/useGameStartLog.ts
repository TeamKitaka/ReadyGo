'use client';

import { useCallback } from 'react';

/**
 * 게임 시작 로그 생성 훅
 *
 * 책임:
 * - 게임 시작 로그를 생성하는 함수 제공
 * - API 호출 및 에러 처리
 */
export const useGameStartLog = () => {
  /**
   * 게임 시작 로그 생성
   */
  const createGameStartLog = useCallback(
    async (params: {
      contextType: 'match' | 'party';
      contextId: string;
      gameId?: string;
      gameName?: string;
    }): Promise<void> => {
      try {
        const response = await fetch('/api/game-start-log/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            context_type: params.contextType,
            context_id: params.contextId,
            game_id: params.gameId ?? null,
            game_name: params.gameName ?? null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(
            'Failed to create game start log:',
            errorData.message || errorData.detail || 'Unknown error'
          );
          // 에러가 발생해도 throw하지 않음 (사용자 경험 우선)
        }
      } catch (error) {
        console.error('Error creating game start log:', error);
        // 에러가 발생해도 throw하지 않음 (사용자 경험 우선)
      }
    },
    []
  );

  return {
    createGameStartLog,
  };
};

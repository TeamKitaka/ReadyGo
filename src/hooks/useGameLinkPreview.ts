'use client';

import { useState, useEffect, useCallback } from 'react';

export type GameInfo = {
  app_id: number;
  name: string | null;
  header_image: string | null;
  short_description: string | null;
  isLoading: boolean;
  hasFailed?: boolean; // 실패한 게임 정보 재시도 방지
};

export type GameInfoMap = Record<number, GameInfo>;

/**
 * 게임 링크 미리보기 Hook
 *
 * 책임:
 * - 메시지에서 steam://run/{appId} 패턴 감지
 * - appId별 게임 정보 캐싱 및 조회
 * - 로딩 상태 관리
 */
export const useGameLinkPreview = (
  messages: Array<{ content?: string | null }>
) => {
  const [gameInfoMap, setGameInfoMap] = useState<GameInfoMap>({});

  /**
   * 게임 정보 조회 함수
   */
  const fetchGameInfo = useCallback(async (appId: number) => {
    // 이미 로딩 중이거나 정보가 있거나 실패한 경우 스킵
    setGameInfoMap((prev) => {
      if (
        prev[appId]?.isLoading ||
        prev[appId]?.name ||
        prev[appId]?.hasFailed
      ) {
        return prev;
      }

      // 로딩 상태 설정
      return {
        ...prev,
        [appId]: {
          app_id: appId,
          name: null,
          header_image: null,
          short_description: null,
          isLoading: true,
          hasFailed: false,
        },
      };
    });

    try {
      const response = await fetch(`/api/steam/game/${appId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch game info: ${response.status}`);
      }

      const data = await response.json();
      setGameInfoMap((prev) => ({
        ...prev,
        [appId]: {
          app_id: appId,
          name: data.data.name || null,
          header_image: data.data.header_image || null,
          short_description: data.data.short_description || null,
          isLoading: false,
        },
      }));
    } catch (error) {
      // 실패한 게임 정보는 재시도하지 않도록 hasFailed 플래그 설정
      setGameInfoMap((prev) => ({
        ...prev,
        [appId]: {
          app_id: appId,
          name: null,
          header_image: null,
          short_description: null,
          isLoading: false,
          hasFailed: true,
        },
      }));
    }
  }, []);

  /**
   * 메시지에서 게임 링크 감지 및 게임 정보 조회
   */
  useEffect(() => {
    const appIds = new Set<number>();
    messages.forEach((message) => {
      const steamLinkMatch = message.content?.match(/steam:\/\/run\/(\d+)/);
      if (steamLinkMatch) {
        const appId = parseInt(steamLinkMatch[1], 10);
        appIds.add(appId);
      }
    });

    appIds.forEach((appId) => {
      fetchGameInfo(appId);
    });
  }, [messages, fetchGameInfo]);

  /**
   * steam://run/{appId} 패턴에서 appId 추출
   */
  const extractGameAppId = useCallback(
    (content?: string | null): number | null => {
      if (!content) {
        return null;
      }
      const match = content.match(/steam:\/\/run\/(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    },
    []
  );

  /**
   * 게임 링크인지 확인
   */
  const isGameLink = useCallback(
    (content?: string | null): boolean => {
      return extractGameAppId(content) !== null;
    },
    [extractGameAppId]
  );

  /**
   * 게임 정보 가져오기
   */
  const getGameInfo = useCallback(
    (appId: number): GameInfo | null => {
      return gameInfoMap[appId] || null;
    },
    [gameInfoMap]
  );

  return {
    gameInfoMap,
    isGameLink,
    extractGameAppId,
    getGameInfo,
  };
};

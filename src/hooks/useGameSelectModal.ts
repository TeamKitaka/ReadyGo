'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type SteamGame = {
  app_id: number;
  name: string;
};

/**
 * 게임 선택 모달 Hook
 *
 * 책임:
 * - 모달 열기/닫기 상태 관리
 * - 게임 목록 조회 및 검색어 필터링
 * - 선택된 게임 상태 관리
 */
export const useGameSelectModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [gameList, setGameList] = useState<SteamGame[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<SteamGame | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 게임 목록 조회
   */
  const fetchGameList = useCallback(async () => {
    setIsLoadingGames(true);
    setError(null);

    try {
      const response = await fetch('/api/steam/games', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || errorData.detail || response.statusText;

        if (response.status === 401) {
          setError('로그인이 필요합니다.');
        } else {
          setError('게임 목록을 불러올 수 없습니다.');
        }
        setGameList([]);
        return;
      }

      const result = await response.json();
      // SelectboxItem 형식에서 SteamGame 형식으로 변환
      const games: SteamGame[] = (result.data || []).map((item: { id: string; value: string }) => ({
        app_id: parseInt(item.id, 10),
        name: item.value,
      }));
      setGameList(games);
    } catch (error) {
      console.error('게임 목록 조회 중 오류 발생:', error);
      setError('게임 목록을 불러오는 중 오류가 발생했습니다.');
      setGameList([]);
    } finally {
      setIsLoadingGames(false);
    }
  }, []);

  /**
   * 모달 열기
   */
  const openModal = useCallback(() => {
    setIsOpen(true);
    setSearchQuery('');
    setSelectedGame(null);
    setError(null);
    // 게임 목록이 없으면 조회
    if (gameList.length === 0) {
      fetchGameList();
    }
  }, [gameList.length, fetchGameList]);

  /**
   * 모달 닫기
   */
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setSelectedGame(null);
    setError(null);
  }, []);

  /**
   * 검색어에 따라 필터링된 게임 목록
   */
  const filteredGames = gameList.filter((game) =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * 게임 선택
   */
  const selectGame = useCallback((game: SteamGame) => {
    setSelectedGame(game);
  }, []);

  /**
   * 검색어 변경
   */
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedGame(null); // 검색어 변경 시 선택 해제
  }, []);

  return {
    isOpen,
    openModal,
    closeModal,
    gameList,
    filteredGames,
    isLoadingGames,
    searchQuery,
    setSearchQuery: handleSearchChange,
    selectedGame,
    selectGame,
    error,
  };
};


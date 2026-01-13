'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type SteamGame = {
  app_id: number;
  name: string;
};

/**
 * 게임 선택 모달 Hook
 *
 * 책임:
 * - 모달 열기/닫기 상태 관리
 * - 게임 목록 조회 및 검색어 필터링 (서버 측 검색 지원)
 * - 선택된 게임 상태 관리
 */
export const useGameSelectModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [gameList, setGameList] = useState<SteamGame[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<SteamGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 게임 목록 조회 (검색어 옵션 포함)
   */
  const fetchGameList = useCallback(async (search?: string) => {
    setIsLoadingGames(true);
    setError(null);

    try {
      const url = new URL('/api/steam/games', window.location.origin);
      if (search && search.trim()) {
        url.searchParams.set('search', search.trim());
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
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
      const games: SteamGame[] = (result.data || []).map(
        (item: { id: string; value: string }) => ({
          app_id: parseInt(item.id, 10),
          name: item.value,
        })
      );
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
    // 게임 목록이 없으면 조회 (전체 목록)
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
   * 검색어 변경 시 서버에서 검색 (debounce 적용)
   */
  useEffect(() => {
    // 기존 타이머 클리어
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 검색어가 있고 모달이 열려있을 때만 서버 검색
    if (isOpen && searchQuery.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        fetchGameList(searchQuery);
      }, 300); // 300ms debounce
    } else if (isOpen && !searchQuery.trim() && gameList.length === 0) {
      // 검색어가 없고 목록도 없으면 전체 목록 조회
      fetchGameList();
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, isOpen, fetchGameList, gameList.length]);

  /**
   * 검색어가 있을 때는 서버에서 필터링된 결과를 사용하고,
   * 없을 때는 클라이언트에서 필터링 (기존 동작 유지)
   */
  const filteredGames = searchQuery.trim()
    ? gameList // 서버에서 이미 필터링됨
    : gameList.filter((game) =>
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

'use client';

import { useState, useCallback } from 'react';

export interface UseFilterReturn {
  selectedGenre: string | undefined;
  searchQuery: string;
  setSelectedGenre: (genre: string | undefined) => void;
  setSearchQuery: (query: string) => void;
  reset: () => void;
}

/**
 * 파티 필터링을 위한 훅
 * 장르 필터와 검색어를 관리합니다.
 */
export const useFilter = (): UseFilterReturn => {
  const [selectedGenre, setSelectedGenre] = useState<string | undefined>(
    undefined
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  const reset = useCallback(() => {
    setSelectedGenre(undefined);
    setSearchQuery('');
  }, []);

  return {
    selectedGenre,
    searchQuery,
    setSelectedGenre,
    setSearchQuery,
    reset,
  };
};

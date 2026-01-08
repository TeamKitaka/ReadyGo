'use client';

import { useState, useCallback } from 'react';

export type SortOption = 'latest' | 'deadline';

interface UsePartySortReturn {
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
}

/**
 * 파티 정렬 옵션 관리 hook
 * - 'latest': 최신순 (created_at 기준 내림차순)
 * - 'deadline': 마감임박순 (start_date + start_time 기준 오름차순)
 */
export const usePartySort = (): UsePartySortReturn => {
  const [sortOption, setSortOptionState] = useState<SortOption>('latest');

  const setSortOption = useCallback((option: SortOption) => {
    setSortOptionState(option);
  }, []);

  return {
    sortOption,
    setSortOption,
  };
};

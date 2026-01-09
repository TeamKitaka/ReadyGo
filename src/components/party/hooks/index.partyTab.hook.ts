'use client';

import { useState, useCallback } from 'react';

export type TabType = 'all' | 'participating';

interface UsePartyTabReturn {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

/**
 * 파티 탭 상태 관리 훅
 * - 'all': 전체 파티 탭
 * - 'participating': 참여 중인 파티 탭
 */
export const usePartyTab = (): UsePartyTabReturn => {
  const [activeTab, setActiveTabState] = useState<TabType>('all');

  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab);
  }, []);

  return {
    activeTab,
    setActiveTab,
  };
};

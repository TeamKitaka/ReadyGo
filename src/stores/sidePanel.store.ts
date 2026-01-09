import { create } from 'zustand';
import type { MatchReasonCoreDTO } from '@/commons/types/match/matchReasonCore.dto';
import type { MatchTagCoreDTO } from '@/commons/types/match/matchTagCore.dto';

/**
 * 프로필 패널에 전달할 매칭 데이터
 */
interface MatchData {
  finalScore: number;
  reasons: MatchReasonCoreDTO[];
  tags: MatchTagCoreDTO[];
}

interface SidePanelStore {
  isOpen: boolean;
  targetUserId?: string;
  matchData?: MatchData;

  open: (userId: string, matchData?: MatchData) => void;
  close: () => void;
}

export const useSidePanelStore = create<SidePanelStore>((set) => ({
  isOpen: false,
  targetUserId: '73ea14dd-2e4d-4d96-b267-bee66a6c8ad5', // 임시 테스트 ID (UI 개발용)
  matchData: undefined,

  open: (userId: string, matchData?: MatchData) =>
    set({ isOpen: true, targetUserId: userId, matchData }),
  close: () =>
    set({ isOpen: false, targetUserId: undefined, matchData: undefined }),
}));

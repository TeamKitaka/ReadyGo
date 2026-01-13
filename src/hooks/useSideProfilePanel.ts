import { useSidePanelStore } from '@/stores/sidePanel.store';
import type { MatchReasonCoreDTO } from '@/commons/types/match/matchReasonCore.dto';
import type { MatchTagCoreDTO } from '@/commons/types/match/matchTagCore.dto';

/**
 * 프로필 패널에 전달할 매칭 데이터
 */
export interface MatchData {
  finalScore: number;
  reasons: MatchReasonCoreDTO[];
  tags: MatchTagCoreDTO[];
}

/**
 * 사이드 프로필 패널을 제어하는 Hook
 *
 * 사용자 프로필을 사이드 패널에서 열고 닫는 기능을 제공합니다.
 *
 * @returns {object} 프로필 패널 제어 함수 및 상태
 * @returns {boolean} isOpen - 현재 패널이 열려있는지 여부
 * @returns {string | undefined} targetUserId - 현재 열린 프로필의 사용자 ID
 * @returns {MatchData | undefined} matchData - 현재 열린 프로필의 매칭 데이터
 * @returns {function} openProfile - 특정 사용자의 프로필 패널을 엽니다
 * @returns {function} closeProfile - 현재 열린 프로필 패널을 닫습니다
 * @returns {function} toggleProfile - 프로필 패널을 토글합니다 (같은 userId면 닫고, 다르면 해당 프로필을 엽니다)
 *
 * @example
 * // 기본 사용법
 * const { toggleProfile, isOpen, targetUserId, matchData } = useSideProfilePanel();
 *
 * // 특정 사용자가 현재 열린 프로필인지 확인
 * const isActive = isOpen && targetUserId === userId;
 *
 * // 매칭 페이지에서 matchData와 함께 열기
 * <Button onClick={() => toggleProfile(userId, { finalScore, reasons, tags })}>
 *   프로필 보기
 * </Button>
 *
 * // 채팅 페이지에서 matchData 없이 열기 (필요시 계산)
 * <Button onClick={() => toggleProfile(userId)}>
 *   프로필 보기
 * </Button>
 */
export const useSideProfilePanel = () => {
  const { isOpen, targetUserId, matchData, open, close } = useSidePanelStore();

  const openProfile = (userId: string, matchData?: MatchData) => {
    open(userId, matchData);
  };

  const closeProfile = () => {
    close();
  };

  const toggleProfile = (userId: string, matchData?: MatchData) => {
    if (isOpen && targetUserId === userId) {
      close();
    } else {
      open(userId, matchData);
    }
  };

  return {
    isOpen,
    targetUserId,
    matchData,
    openProfile,
    closeProfile,
    toggleProfile,
  };
};

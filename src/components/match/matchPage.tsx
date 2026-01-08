'use client';

import React, { useMemo } from 'react';
import styles from './styles.module.css';
import { MatchList } from './ui';
import MatchListSkeleton from './ui/match-list/matchListSkeleton';
import { useMatchFilters } from './hooks/useMatchFilters';
import { useSidePanelStore } from '@/stores/sidePanel.store';
import { useAuthStore } from '@/stores/auth.store';
import { useMatchResults } from '@/hooks/useMatchResults';
import { MatchData } from './types/match.types';
import { getEffectiveStatus } from '@/stores/user-status.store';
import { usePresenceStore } from '@/stores/presence.store';

interface MatchResultWithProfile {
  targetUserId: string;
  finalScore: number;
  isOnlineMatched: boolean;
  availabilityHint: 'online' | 'offline' | 'unknown';
  profile?: {
    nickname: string;
    avatarUrl?: string;
    animalType?: string;
  };
  status?: 'online' | 'offline';
}

export default function Match() {
  // 현재 로그인한 사용자 정보
  const { user } = useAuthStore();
  const viewerId = user?.id;

  // Presence 상태 구독 (Presence 변경 시 재정렬)
  const { presenceUserIds } = usePresenceStore();

  // 필터 상태 관리
  const {
    selectedMatchRate,
    selectedStatus,
    handleMatchRateChange,
    handleStatusChange,
    handleRefresh,
  } = useMatchFilters();

  // side-panel 상태 관리
  const { isOpen, targetUserId, open, close } = useSidePanelStore();

  // 매칭 결과 가져오기 (전체)
  const { results, loading, error, refetch } = useMatchResults(viewerId || '', {
    sortBy: 'score',
  });

  // 매칭 결과를 MatchData 형식으로 변환 및 Presence 기반 정렬
  const matchData = useMemo(() => {
    if (!results.length) {
      return [];
    }

    // API에서 이미 프로필과 상태 정보가 포함되어 있으므로 바로 변환
    const matchDataArray: MatchData[] = results.map((result, index) => {
      const enrichedResult = result as MatchResultWithProfile;
      return {
        id: index + 1,
        userId: result.targetUserId,
        nickname: enrichedResult.profile?.nickname || '알 수 없음',
        matchRate: Math.round(result.finalScore),
        status: enrichedResult.status || 'offline',
        avatarUrl: enrichedResult.profile?.avatarUrl,
        tags: [], // TODO: 나중에 user traits에서 가져오기
      };
    });

    // Presence 기반 실시간 정렬
    // 1순위: 온라인 상태 (Presence 기반)
    // 2순위: 매칭 점수 높은 순
    return matchDataArray.sort((a, b) => {
      const aStatus = getEffectiveStatus(a.userId);
      const bStatus = getEffectiveStatus(b.userId);

      const aOnline = aStatus !== 'offline';
      const bOnline = bStatus !== 'offline';

      // 온라인 상태가 다르면 온라인이 먼저
      if (aOnline !== bOnline) {
        return aOnline ? -1 : 1;
      }

      // 온라인 상태가 같으면 점수 높은 순
      return b.matchRate - a.matchRate;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, presenceUserIds]); // Presence 변경 시 재정렬 (presenceUserIds는 getEffectiveStatus 내부에서 사용됨)

  // 프로필 클릭 핸들러
  const handleProfileClick = (userId: string) => {
    if (isOpen && targetUserId === userId) {
      close();
    } else {
      open(userId);
    }
  };

  // 갱신 핸들러 (useMatchFilters의 handleRefresh + useMatchResults의 refetch 결합)
  const handleRefreshWithData = () => {
    handleRefresh();
    refetch();
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* 헤더 섹션 */}
        <div className={styles.header}>
          <h1 className={styles.title}>매칭 찾기</h1>
          <p className={styles.subtitle}>너랑 딱 맞는 게임 친구를 찾아봐</p>
        </div>

        {/* 로딩 상태 */}
        {loading && <MatchListSkeleton isSidePanelOpen={isOpen} />}

        {/* 에러 상태 */}
        {error && (
          <div className={styles.error}>
            매칭 결과를 불러오는 데 실패했습니다: {error.message}
          </div>
        )}

        {/* 매치 리스트 섹션 */}
        {!loading && !error && (
          <MatchList
            matches={matchData}
            selectedMatchRate={selectedMatchRate}
            selectedStatus={selectedStatus}
            isSidePanelOpen={isOpen}
            activeProfileUserId={targetUserId}
            onMatchRateChange={handleMatchRateChange}
            onStatusChange={handleStatusChange}
            onRefresh={handleRefreshWithData}
            onProfileClick={handleProfileClick}
          />
        )}
      </div>
    </div>
  );
}

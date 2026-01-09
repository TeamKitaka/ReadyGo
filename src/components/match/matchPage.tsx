'use client';

import React, { useMemo, useState, useEffect } from 'react';
import styles from './styles.module.css';
import { MatchList } from './ui';
import MatchListSkeleton from './ui/match-list/matchListSkeleton';
import { useMatchFilters } from './hooks/useMatchFilters';
import { useSidePanelStore } from '@/stores/sidePanel.store';
import { useAuthStore } from '@/stores/auth.store';
import { useMatchList } from '@/hooks/useMatchList';
import { MatchData, MatchResultWithProfile } from './types/match.types';
import { getEffectiveStatus } from '@/stores/user-status.store';
import { usePresenceStore } from '@/stores/presence.store';
import { useProfileBinding } from '@/components/overlay/profile/hooks/index.binding.hook';
import { useSteamOAuth } from '@/components/auth/hooks/useSteamOAuth.hook';
import { SteamAlert } from '@/commons/layout/ui/steamAlert';
import { TraitsAlert } from '@/commons/layout/ui/traitsAlert';
import { AnimalType } from '@/commons/constants/animal/animal.enum';

export default function Match() {
  // 현재 로그인한 사용자 정보
  const { user } = useAuthStore();
  const viewerId = user?.id;

  // 스팀 연동 상태 확인
  const { profileData: profileBindingData, isLoading: profileBindingLoading } =
    useProfileBinding();

  // 스팀 알림 배너 닫기 상태 관리
  const [isSteamAlertDismissed, setIsSteamAlertDismissed] = useState(false);
  const { handleSteamLink } = useSteamOAuth();

  // localStorage에서 닫기 상태 확인
  useEffect(() => {
    const dismissed = localStorage.getItem('steam-alert-dismissed');
    if (dismissed === 'true') {
      setIsSteamAlertDismissed(true);
    }
  }, []);

  // 스팀 알림 배너 닫기 핸들러
  const handleSteamAlertClose = () => {
    localStorage.setItem('steam-alert-dismissed', 'true');
    setIsSteamAlertDismissed(true);
  };

  // 성향 분석 완료 여부 확인
  const isTraitsCompleted =
    !profileBindingLoading &&
    profileBindingData.animalType !== null &&
    profileBindingData.animalType !== 'unknown' &&
    profileBindingData.animalType !== AnimalType.unknown;

  // 스팀 연동 여부 확인 (로딩 완료 후에만 확인)
  const isSteamNotConnected =
    !profileBindingLoading && profileBindingData.isSteamConnected === false;
  const isSteamConnected =
    !profileBindingLoading && profileBindingData.isSteamConnected === true;

  // 안내 배너 표시 우선순위:
  // 1순위: 성향 분석 미완료 → TraitsAlert
  // 2순위: 성향 완료 + 스팀 미연동 + 닫지 않음 → SteamAlert
  const shouldShowTraitsAlert = !profileBindingLoading && !isTraitsCompleted;
  const shouldShowSteamAlert =
    !profileBindingLoading &&
    isTraitsCompleted &&
    isSteamNotConnected &&
    !isSteamAlertDismissed;

  // 디버깅용 로그 (개발 환경에서만)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Match Alert Debug:', {
        profileBindingLoading,
        isTraitsCompleted,
        isSteamNotConnected,
        isSteamAlertDismissed,
        shouldShowTraitsAlert,
        shouldShowSteamAlert,
        profileBindingData: {
          animalType: profileBindingData.animalType,
          isSteamConnected: profileBindingData.isSteamConnected,
        },
      });
    }
  }, [
    profileBindingLoading,
    isTraitsCompleted,
    isSteamNotConnected,
    isSteamAlertDismissed,
    shouldShowTraitsAlert,
    shouldShowSteamAlert,
    profileBindingData,
  ]);

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

  // 매칭 결과 가져오기 (초기 로드만, 필터는 버튼 클릭 시 적용)
  const { results, loading, error, filters, refetch } = useMatchList();

  // 매칭 결과를 MatchData 형식으로 변환 및 Presence 기반 정렬
  const matchData = useMemo(() => {
    if (!results.length) {
      return [];
    }

    // useMatchList API 응답 형식에 맞게 변환
    const matchDataArray: MatchData[] = results.map((result, index) => {
      // getMatchList 서비스에서 enrichAndSort를 거친 결과 구조
      const targetUserId = result.profile?.userId || result.target_id || result.targetUserId;
      const score = result.score || result.finalScore || 0;
      
      return {
        id: index + 1,
        userId: targetUserId,
        nickname: result.profile?.nickname || '알 수 없음',
        matchRate: Math.round(score),
        status: result.status || 'offline',
        avatarUrl: result.profile?.avatarUrl,
        tags: [], // 하위 호환용 (곧 제거 예정)
        reasons: result.reasons || [], // CoreDTO 전달
        tagsV2: result.tags || [], // CoreDTO 전달
      };
    });

    // Presence 기반 실시간 정렬 (서버에서 이미 정렬되었지만, Presence 변경 시 재정렬)
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
      // 해당 userId의 matchData 찾기
      const targetMatch = matchData.find((m) => m.userId === userId);

      // matchData와 함께 전달 (즉시 표시, 재계산 불필요)
      open(
        userId,
        targetMatch
          ? {
              finalScore: targetMatch.matchRate,
              reasons: targetMatch.reasons,
              tags: targetMatch.tagsV2,
            }
          : undefined
      );
    }
  };

  // 갱신 핸들러 (셀렉트박스 선택 후 버튼 클릭 시 서버에 재요청)
  const handleRefreshWithData = () => {
    handleRefresh(); // useMatchFilters의 내부 로직 (현재는 TODO)
    
    // 최신 필터 옵션으로 서버에 재요청 (캐시 스킵 + 실시간 계산)
    refetch({
      minScore: selectedMatchRate ? Number(selectedMatchRate) : undefined,
      statusFilter: selectedStatus as 'all' | 'online' | 'offline' || 'all',
      refresh: true, // 🔥 캐시 스킵, 강제 실시간 계산
    });
  };

  return (
    <div className={styles.container}>
      {/* 성향 분석 안내 배너 (1순위) */}
      {shouldShowTraitsAlert && (
        <TraitsAlert className={styles.traitsAlertContainer} />
      )}

      {/* 스팀 연동 알림 배너 (2순위) */}
      {shouldShowSteamAlert && (
        <SteamAlert
          onConnect={handleSteamLink}
          onClose={handleSteamAlertClose}
          className={styles.steamAlertContainer}
        />
      )}

      <div className={styles.content}>
        {/* 헤더 섹션 */}
        <div className={styles.header}>
          <h1 className={styles.title}>매칭 찾기</h1>
          <p className={styles.subtitle}>너랑 딱 맞는 게임 친구를 찾아봐</p>
        </div>

        {/* 성향 분석 미완료 시 매칭 목록 숨김 */}
        {shouldShowTraitsAlert ? (
          <div className={styles.emptyState}>
            <p>게임 성향 분석을 완료하면 나와 잘 맞는 친구를 찾을 수 있어요!</p>
          </div>
        ) : (
          <>
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
                isSteamConnected={isSteamConnected}
                onMatchRateChange={handleMatchRateChange}
                onStatusChange={handleStatusChange}
                onRefresh={handleRefreshWithData}
                onProfileClick={handleProfileClick}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

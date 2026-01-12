'use client';

import React, { useMemo } from 'react';
import styles from './styles.module.css';
import MatchSection from './ui/match-section/matchSection';
import PartySection from './ui/party-section/partySection';
import ProfileSection from './ui/profile-section/profileSection';
import StartSection from './ui/start-section/startSection';
import { AnimalType } from '@/commons/constants/animal';
import { BarChartDataItem } from '@/commons/components/bar-chart';
import { useGoogleOAuth } from '@/components/auth/hooks/useGoogleOAuth.hook';
import { useKakaoOAuth } from '@/components/auth/hooks/useKakaoOAuth.hook';
import { useSidePanelStore } from '@/stores/sidePanel.store';
import { useProfile } from './hooks/useProfile';
import { useHomeMatches } from './hooks/useHomeMatches';
import { useHomeParties } from './hooks/useHomeParties';
import { usePresenceStore } from '@/stores/presence.store';
import { getEffectiveStatus } from '@/stores/user-status.store';

// 임시 Bar Chart 데이터 (최근 플레이 패턴)
const mockBarData: BarChartDataItem[] = [
  { label: 'FPS', value: 23.6 },
  { label: '생존', value: 18.2 },
  { label: '모험', value: 12.5 },
  { label: '캐주얼', value: 8.7 },
];

export default function Home() {
  // OAuth 콜백 처리를 위한 Hook 호출
  useGoogleOAuth();
  useKakaoOAuth();

  const { isOpen } = useSidePanelStore();

  // 프로필 데이터 fetch + 상태 관리 (ProfileViewModel 반환)
  const {
    data: profileViewModel,
    loading: profileLoading,
    error: profileError,
  } = useProfile();

  // 매칭 데이터 fetch (Step 1: 캐시 기반)
  const { matchCards } = useHomeMatches();

  // 파티 데이터 fetch (시작 시간 임박, 인원 미달, 미참여 파티)
  const { parties, loading: partiesLoading, error: partiesError } =
    useHomeParties();

  // 디버깅: 파티 데이터 확인
  console.log('[HomePage] Parties data:', {
    parties,
    loading: partiesLoading,
    error: partiesError,
  });

  // Presence 상태 구독 (실시간 온라인 상태 반영)
  usePresenceStore();

  // Presence 기반 실시간 상태 반영
  const matchCardsWithPresence = useMemo(() => {
    return matchCards.map((card) => ({
      ...card,
      status: getEffectiveStatus(card.userId),
    }));
  }, [matchCards]);

  // 테스트 완료 여부 확인 (animalType이 unknown이 아니고 null/undefined가 아니며, 또는 traits가 존재하면 완료)
  const isTestCompleted =
    !profileLoading &&
    profileViewModel !== null &&
    profileViewModel !== undefined &&
    ((profileViewModel.animalType !== null &&
      profileViewModel.animalType !== undefined &&
      profileViewModel.animalType !== AnimalType.unknown) ||
      (profileViewModel.traits !== null &&
        profileViewModel.traits !== undefined));

  // 테스트 미완료 여부 확인 (로딩 중이 아니고, 프로필이 없거나 테스트가 완료되지 않은 경우)
  const isTestNotCompleted = !profileLoading && !isTestCompleted;

  return (
    <div className={styles.container}>
      {/* 왼쪽 컨텐츠 영역 */}
      <div
        className={`${styles.leftSection} ${isOpen ? styles.sidePanelOpen : ''}`}
      >
        {/* 테스트 미완료: Start Section 표시, Match Section 숨김 */}
        {isTestNotCompleted && <StartSection className={styles.startSection} />}

        {/* 테스트 완료: Match Section 표시, Start Section 숨김 */}
        {isTestCompleted && (
          <MatchSection
            title="레전드 조합, ㄹㄷ? 🎲"
            matches={matchCardsWithPresence}
            className={styles.matchSection}
          />
        )}

        {/* 파티 섹션 (항상 표시) */}
        <PartySection
          title="너만 오면 ㄱ!🔥 "
          parties={parties}
          className={styles.partySection}
        />
      </div>

      {/* 오른쪽 사이드바 영역 */}
      <div className={styles.rightSection}>
        {!isOpen && (
          <div className={styles.profileStateContainer}>
            {/* 로딩 상태 */}
            {profileLoading && (
              <div className={styles.profileState}>
                <p>프로필을 불러오는 중...</p>
              </div>
            )}

            {/* 에러 상태 */}
            {!profileLoading && profileError && (
              <div className={styles.profileState}>
                <p>프로필을 불러올 수 없습니다.</p>
              </div>
            )}

            {/* Empty 상태 (데이터 없음) */}
            {!profileLoading && !profileError && !profileViewModel && (
              <div className={styles.profileState}>
                <p>프로필 정보가 없습니다.</p>
              </div>
            )}

            {/* 데이터 있음 - ProfileSection 컴포넌트 사용 */}
            {!profileLoading && !profileError && profileViewModel && (
              <ProfileSection
                nickname={profileViewModel.nickname || '익명 사용자'}
                tier={profileViewModel.tier}
                animal={profileViewModel.animalType || AnimalType.rabbit}
                activeTime={profileViewModel.activeTimeText}
                perfectMatchTypes={profileViewModel.perfectMatchTypes}
                radarData={profileViewModel.radarData || []}
                barData={mockBarData}
                className={styles.profileSection}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import styles from './styles.module.css';
import MatchSection from './ui/match-section/matchSection';
import PartySection from './ui/party-section/partySection';
import ProfileSection from './ui/profile-section/profileSection';
import StartSection from './ui/start-section/startSection';
import { AnimalType } from '@/commons/constants/animal';
import { useGoogleOAuth } from '@/components/auth/hooks/useGoogleOAuth.hook';
import { useKakaoOAuth } from '@/components/auth/hooks/useKakaoOAuth.hook';
import { useSidePanelStore } from '@/stores/sidePanel.store';
import { useProfile } from './hooks/useProfile';
import { useHomeMatches } from './hooks/useHomeMatches';
import { useHomeParties } from './hooks/useHomeParties';
import { usePresenceStore } from '@/stores/presence.store';
import { getEffectiveStatus } from '@/stores/user-status.store';
import {
  getFavoriteGenreText,
  getWeeklyAverageText,
} from '@/features/profile/domain/toSteamStatsText';
import { toGameStyleFromTraits } from '@/features/profile/domain/toGameStyleFromTraits';
import { toActiveTimeText } from '@/features/profile/domain/toActiveTimeText';

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
  const { parties } = useHomeParties();

  // Presence 상태 구독 (실시간 온라인 상태 반영)
  usePresenceStore();

  // Presence 기반 실시간 상태 반영
  const matchCardsWithPresence = useMemo(() => {
    return matchCards.map((card) => ({
      ...card,
      status: getEffectiveStatus(card.userId),
    }));
  }, [matchCards]);

  // 프로필 정보 텍스트 변환 (ProfileSection용)
  const profileTexts = useMemo(() => {
    if (!profileViewModel) {
      return {
        favoriteGenre: '--',
        activeTime: undefined,
        gameStyle: '--',
        weeklyAverage: '--시간',
      };
    }

    // 게임 성향: 성향분석 결과 우선, 없으면 기본값
    const gameStyleFromTraits = toGameStyleFromTraits(profileViewModel.traits);
    const gameStyle = gameStyleFromTraits || '--';

    // 활동 시간: 성향분석 결과(schedule) 우선, 없으면 activeTimeText
    const activeTimeFromSchedule = toActiveTimeText(profileViewModel.schedule);
    const activeTime =
      activeTimeFromSchedule || profileViewModel.activeTimeText || undefined;

    // 선호 장르: 스팀 상태에 따라 표시
    const favoriteGenre = getFavoriteGenreText(
      profileViewModel.steamId,
      profileViewModel.steamStats
    );

    // 주간 평균: 스팀 상태에 따라 표시
    const weeklyAverage = getWeeklyAverageText(
      profileViewModel.steamId,
      profileViewModel.steamStats
    );

    return {
      favoriteGenre,
      activeTime,
      gameStyle,
      weeklyAverage,
    };
  }, [profileViewModel]);

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
                favoriteGenre={profileTexts.favoriteGenre}
                activeTime={profileTexts.activeTime}
                gameStyle={profileTexts.gameStyle}
                weeklyAverage={profileTexts.weeklyAverage}
                perfectMatchTypes={profileViewModel.perfectMatchTypes}
                radarData={profileViewModel.radarData || []}
                barData={profileViewModel.barChartData || []}
                className={styles.profileSection}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

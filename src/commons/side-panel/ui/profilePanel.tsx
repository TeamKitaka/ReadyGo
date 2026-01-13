'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import styles from './styles.module.css';
import AnimalCard from '../../components/animal-card';
import RadarChart from '../../components/radar-chart';
import ModalContainer from '../../components/modal-container';
import Modal from '../../components/modal';
import { useProfileByUserId } from '@/hooks/useProfileByUserId';
import { useAuthStore } from '@/stores/auth.store';
import { AnimalType } from '../../constants/animal';
import { useChatList } from '@/components/chat/hooks';
import { useSidePanelStore } from '@/stores/sidePanel.store';
import { useFriendStatus } from '@/hooks/useFriendStatus';
import { useSendFriendRequest } from '@/hooks/useSendFriendRequest';
import { toMatchResultViewModel } from '@/viewmodels/match/toMatchResultViewModel';
import type { MatchReasonCoreDTO } from '@/commons/types/match/matchReasonCore.dto';
import type { MatchTagCoreDTO } from '@/commons/types/match/matchTagCore.dto';
import {
  getFavoriteGenreText,
  getWeeklyAverageText,
} from '@/features/profile/domain/toSteamStatsText';
import { toGameStyleFromTraits } from '@/features/profile/domain/toGameStyleFromTraits';
import { toActiveTimeText } from '@/features/profile/domain/toActiveTimeText';

export interface ProfilePanelProps {
  userId: string;
  className?: string;
}

export default function ProfilePanel({
  userId,
  className = '',
}: ProfilePanelProps) {
  const router = useRouter();
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // 쿠키에서 내 userId 가져오기
  const myUserId = useAuthStore((state) => state.user?.id);

  // Store에서 matchData 가져오기
  const { matchData: storeMatchData } = useSidePanelStore();

  // 필요시 matchData 계산 상태
  interface CalculatedMatchData {
    finalScore: number;
    reasons: MatchReasonCoreDTO[];
    tags: MatchTagCoreDTO[];
  }
  const [calculatedMatchData, setCalculatedMatchData] =
    useState<CalculatedMatchData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // 본인 프로필 여부
  const isMyProfile = myUserId === userId;

  // 내 프로필 가져오기 (비교용)
  const { viewModel: myProfile } = useProfileByUserId(myUserId);

  // 상대방 프로필 가져오기
  const { loading, viewModel, error, empty } = useProfileByUserId(userId);

  // 채팅 목록 가져오기 (기존 채팅방 확인용)
  const { chatRooms } = useChatList();

  // 친구 상태 확인
  const { status: friendStatus } = useFriendStatus(isMyProfile ? null : userId);

  // 친구 요청 보내기
  const { sendRequest, isLoading: isSendingRequest } = useSendFriendRequest();

  // 모달 상태
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showAlreadyFriendModal, setShowAlreadyFriendModal] = useState(false);

  // 친구 추가 핸들러
  const handleAddFriend = () => {
    if (isMyProfile) {
      return;
    }

    if (friendStatus === 'friend') {
      setShowAlreadyFriendModal(true);
    } else {
      setShowFriendModal(true);
    }
  };

  // 친구 요청 전송 확인 핸들러
  const handleConfirmFriendRequest = async () => {
    if (!userId || isSendingRequest) {
      return;
    }

    const success = await sendRequest(userId);
    if (success) {
      setShowFriendModal(false);
      // 친구 상태가 업데이트되도록 약간의 지연 후 상태 확인
      setTimeout(() => {
        // 상태는 자동으로 업데이트됨
      }, 500);
    }
  };

  // 채팅하기 버튼 핸들러
  const handleStartChat = async () => {
    if (!myUserId || !userId || isCreatingChat) {
      return;
    }

    try {
      setIsCreatingChat(true);

      // 먼저 기존 채팅방이 있는지 확인
      const existingRoom = chatRooms.find((room) => {
        // 다른 멤버의 user_id가 현재 userId와 일치하는지 확인
        return room.otherMember?.id === userId && room.room.type === 'direct';
      });

      if (existingRoom && existingRoom.room.id) {
        // 기존 채팅방이 있으면 해당 채팅방으로 이동
        router.push(`/chat/${existingRoom.room.id}`);
        return;
      }

      // 기존 채팅방이 없으면 새로 생성
      const response = await fetch('/api/chat/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberIds: [myUserId, userId],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ProfilePanel] Failed to create chat room:', errorData);
        alert('채팅방 생성에 실패했습니다.');
        return;
      }

      const { data: newRoom } = await response.json();

      // 채팅 페이지로 이동
      router.push(`/chat/${newRoom.id}`);
    } catch (error) {
      console.error('[ProfilePanel] Error creating chat room:', error);
      alert('채팅방 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreatingChat(false);
    }
  };

  // matchData가 없을 때 계산 (채팅 페이지 등에서 열었을 경우)
  useEffect(() => {
    // 조건: Store에 matchData 없고, 본인이 아니고, 아직 계산 안 했고, 계산 중이 아닐 때
    if (
      !storeMatchData &&
      !isMyProfile &&
      !calculatedMatchData &&
      !isCalculating &&
      myUserId
    ) {
      const fetchMatchData = async () => {
        setIsCalculating(true);
        try {
          const response = await fetch('/api/match/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              viewerId: myUserId,
              targetUserId: userId,
            }),
          });

          if (response.ok) {
            const { finalScore, reasons, tags } = await response.json();
            setCalculatedMatchData({ finalScore, reasons, tags });
          }
        } catch (error) {
          console.error('[ProfilePanel] Failed to calculate match:', error);
        } finally {
          setIsCalculating(false);
        }
      };

      fetchMatchData();
    }
  }, [
    storeMatchData,
    isMyProfile,
    myUserId,
    userId,
    calculatedMatchData,
    isCalculating,
  ]);

  // matchData 우선순위: Store > 계산됨 > null
  const matchData = storeMatchData || calculatedMatchData;

  // matchReasons 생성 (AnimalCard에 전달할 string[])
  const matchReasons = useMemo(() => {
    if (!matchData || isMyProfile) {
      return [];
    }

    // toMatchResultViewModel 사용하여 변환
    const mockCoreDTO = {
      userId: myUserId || '',
      targetUserId: userId,
      similarityScore: matchData.finalScore,
      isOnlineMatched: false,
      reasons: matchData.reasons,
      tags: matchData.tags,
    };

    const viewModel = toMatchResultViewModel(mockCoreDTO);

    // shortDescription 추출하여 string[]로 변환
    // 표시 개수 결정: 상위 2개 길이 합이 15자 이하면 3개, 초과하면 2개
    const allReasons = viewModel.reasons.map((r) => r.shortDescription);

    if (allReasons.length === 0) {
      return [];
    }

    // 상위 2개 길이 체크
    const top2Length = allReasons.slice(0, 2).join('').length;
    const displayCount = top2Length <= 15 ? 3 : 2;

    return allReasons.slice(0, displayCount);
  }, [matchData, isMyProfile, myUserId, userId]);

  const containerClasses = [styles.profilePanel, className]
    .filter(Boolean)
    .join(' ');

  // Loading 상태 (상대방 프로필 로딩 중)
  // 내 프로필은 로딩 중이어도 상대방 프로필만 먼저 표시 가능
  if (loading) {
    return (
      <div className={containerClasses}>
        <div className={styles.loading}>프로필 로딩 중...</div>
      </div>
    );
  }

  // Empty 상태 (userId가 없음)
  if (empty) {
    return (
      <div className={containerClasses}>
        <div className={styles.error}>사용자 정보가 없습니다.</div>
      </div>
    );
  }

  // Error 상태 처리
  if (error) {
    // 401: Unauthorized
    if (error.status === 401) {
      return (
        <div className={containerClasses}>
          <div className={styles.error}>로그인이 필요합니다.</div>
        </div>
      );
    }

    // 403: Forbidden
    if (error.status === 403) {
      return (
        <div className={containerClasses}>
          <div className={styles.error}>접근 권한이 없습니다.</div>
        </div>
      );
    }

    // 404: Not Found
    if (error.status === 404) {
      return (
        <div className={containerClasses}>
          <div className={styles.error}>프로필을 찾을 수 없습니다.</div>
        </div>
      );
    }

    // 기타 에러
    return (
      <div className={containerClasses}>
        <div className={styles.error}>프로필을 불러올 수 없습니다.</div>
      </div>
    );
  }

  // Success 상태 - ViewModel이 없는 경우
  if (!viewModel) {
    return (
      <div className={containerClasses}>
        <div className={styles.error}>프로필 데이터가 없습니다.</div>
      </div>
    );
  }

  // Success 상태 - ViewModel로 렌더링
  const {
    nickname,
    tier,
    animalType,
    radarData,
    activeTimeText,
    steamStats,
    steamId,
    traits,
    schedule,
  } = viewModel;

  // 게임 성향: 성향분석 결과 우선, 없으면 스팀 데이터
  const gameStyleFromTraits = toGameStyleFromTraits(traits);
  const gameStyle = gameStyleFromTraits || '알 수 없음';

  // 활동 시간: 성향분석 결과(schedule) 우선, 없으면 스팀 데이터
  const activeTimeFromSchedule = toActiveTimeText(schedule);
  const activeTime = activeTimeFromSchedule || activeTimeText || '알 수 없음';

  // 선호 장르: 스팀 상태에 따라 표시
  const favoriteGenre = getFavoriteGenreText(steamId, steamStats);

  // 주간 평균: 스팀 상태에 따라 표시
  const weeklyAverage = getWeeklyAverageText(steamId, steamStats);

  return (
    <>
      <div className={containerClasses}>
        {/* Animal Card - 사용자 프로필 */}
        <AnimalCard
          property={isMyProfile ? 'my' : 'user'}
          nickname={nickname || '익명 사용자'}
          tier={tier}
          animal={animalType ?? AnimalType.rabbit}
          favoriteGenre={favoriteGenre}
          activeTime={activeTime}
          gameStyle={gameStyle}
          weeklyAverage={weeklyAverage}
          matchPercentage={
            isMyProfile ? undefined : (matchData?.finalScore ?? 0)
          }
          matchReasons={isMyProfile ? undefined : matchReasons}
          onMessageClick={handleStartChat}
          onProfileClick={isMyProfile ? undefined : handleAddFriend}
        />

        {/* 플레이스타일과 최근 플레이 패턴을 포함하는 통합 섹션 */}
        <div className={styles.statsContainer}>
          {/* 플레이스타일 섹션 */}
          <div className={styles.playStyleSection}>
            <div className={styles.sectionHeader}>
              <h4 className={styles.sectionTitle}>플레이스타일</h4>
            </div>
            {radarData && radarData.length > 0 ? (
              <div className={styles.radarChartWrapper}>
                <RadarChart
                  myData={myProfile?.radarData || []}
                  userData={radarData}
                  size="m"
                  showLabels={true}
                />
              </div>
            ) : (
              <div
                style={{ padding: '20px', textAlign: 'center', color: '#999' }}
              >
                특성 검사를 완료하지 않은 사용자입니다.
              </div>
            )}
          </div>

          {/* 최근 플레이 패턴 섹션 - 현재 ViewModel에 없으므로 숨김 */}
          {/* <div className={styles.playPatternSection}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>최근 플레이 패턴</h4>
          </div>
          <div className={styles.barChartWrapper}>
            <BarChart data={[]} size="s" showValues={true} />
          </div>
        </div> */}
        </div>
      </div>

      {/* 친구 추가 확인 모달 */}
      {showFriendModal &&
        typeof window !== 'undefined' &&
        createPortal(
          <ModalContainer onClose={() => setShowFriendModal(false)}>
            <Modal
              variant="dual"
              title="친구 추가"
              description={`${nickname || '사용자'}님을 친구로 등록하시겠습니까?`}
              onConfirm={handleConfirmFriendRequest}
              onCancel={() => setShowFriendModal(false)}
              confirmText="확인"
              cancelText="취소"
            />
          </ModalContainer>,
          document.body
        )}

      {/* 이미 친구 모달 */}
      {showAlreadyFriendModal &&
        typeof window !== 'undefined' &&
        createPortal(
          <ModalContainer onClose={() => setShowAlreadyFriendModal(false)}>
            <Modal
              variant="single"
              title="알림"
              description="이미 친구로 등록된 사용자입니다."
              onConfirm={() => setShowAlreadyFriendModal(false)}
              confirmText="확인"
            />
          </ModalContainer>,
          document.body
        )}
    </>
  );
}

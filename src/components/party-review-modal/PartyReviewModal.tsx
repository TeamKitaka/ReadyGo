'use client';

import { useMemo } from 'react';
import ModalContainer from '@/commons/components/modal-container';
import Button from '@/commons/components/button';
import Avatar from '@/commons/components/avatar';
import Icon from '@/commons/components/icon';
import Tag from '@/commons/components/tag';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import type {
  ReviewRequestWithProfile,
  PartyInfo,
  PartyMemberInfo,
} from '@/hooks/usePartyReviewModal.hook';
import type { AnimalType } from '@/commons/constants/animal';
import styles from './styles.module.css';

interface PartyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyInfo: PartyInfo | null;
  reviewRequests: ReviewRequestWithProfile[];
  partyMembers: PartyMemberInfo[];
  selectedTargetId: string | null;
  onSelectMember: (targetId: string) => void;
  onBackToMemberList: () => void;
  highlightReviewRequestId?: number;
  isSubmitting?: boolean;
}

/**
 * 날짜/시간 포맷팅
 * "YYYY-MM-DD HH:mm:ss" → "MM/DD 오전/오후 H:MM"
 */
const formatDateTime = (startDate: string, startTime: string): string => {
  try {
    // startDate: "YYYY-MM-DD", startTime: "HH:mm:ss"
    const date = new Date(`${startDate}T${startTime}`);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');

    return `${month}/${day} ${ampm} ${displayHours}:${displayMinutes}`;
  } catch {
    return `${startDate} ${startTime}`;
  }
};

/**
 * 파티 후기 작성 모달 (1단 모달)
 *
 * 책임:
 * - 파티 멤버 목록 표시
 * - 각 멤버의 후기 작성 상태 표시 (pending/completed)
 * - 멤버 선택 시 2단 모달로 전환
 * - 진행률 표시
 * - 모든 멤버 완료 시 완료 메시지 표시
 */
export default function PartyReviewModal({
  isOpen,
  onClose,
  partyInfo,
  reviewRequests,
  partyMembers,
  selectedTargetId,
  onSelectMember,
  onBackToMemberList,
  highlightReviewRequestId,
  isSubmitting = false,
}: PartyReviewModalProps) {
  const { user } = useAuth();

  // 파티장 정보 맵 생성
  const leaderMap = useMemo(() => {
    const map = new Map<string, boolean>();
    partyMembers.forEach((member) => {
      if (member.role === 'leader') {
        map.set(member.user_id, true);
      }
    });
    // creator_id도 파티장으로 간주
    if (partyInfo?.creator_id) {
      map.set(partyInfo.creator_id, true);
    }
    return map;
  }, [partyMembers, partyInfo]);

  // ESC/backdrop 클릭 처리
  const handleBackdropClick = () => {
    if (isSubmitting) {
      return; // submit 중에는 닫기 방지
    }

    if (selectedTargetId !== null) {
      // 2단 모달이 열려있으면 1단으로 복귀 (모달은 닫지 않음)
      onBackToMemberList();
      return;
    }

    // 1단 모달만 열려있으면 전체 종료
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalContainer onClose={handleBackdropClick}>
      <div className={styles.container}>
        {/* 헤더 */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.indicator}>
              <div className={styles.indicatorDot} />
              <div className={styles.indicatorDot} />
              <div className={styles.indicatorDot} />
            </div>
            <div className={styles.headerText}>review</div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className={styles.mainContent}>
          {/* 제목 섹션 */}
          <div className={styles.titleSection}>
            <h2 className={styles.title}>
              함께한 파티 멤버들과의 게임은 어떠셨나요?
            </h2>
            <p className={styles.subtitle}>
              함께한 시간이 소중한 피드백이 됩니다
            </p>
          </div>

          {/* 파티 정보 섹션 */}
          {partyInfo && (
            <div className={styles.partyInfoSection}>
              <h3 className={styles.partyInfoTitle}>파티 정보</h3>
              <div className={styles.partyInfoGrid}>
                <div className={styles.partyInfoItem}>
                  <div className={styles.partyInfoLabelWrapper}>
                    <Icon
                      name="gaming"
                      size={20}
                      className={styles.partyInfoIcon}
                    />
                    <span className={styles.partyInfoLabel}>게임</span>
                  </div>
                  <span className={styles.partyInfoValue}>
                    {partyInfo.game_title}
                  </span>
                </div>
                <div className={styles.partyInfoItem}>
                  <div className={styles.partyInfoLabelWrapper}>
                    <Icon
                      name="time"
                      size={20}
                      className={styles.partyInfoIcon}
                    />
                    <span className={styles.partyInfoLabel}>시작 시간</span>
                  </div>
                  <span className={styles.partyInfoValue}>
                    {formatDateTime(partyInfo.start_date, partyInfo.start_time)}
                  </span>
                </div>
                <div className={styles.partyInfoItem}>
                  <div className={styles.partyInfoLabelWrapper}>
                    <Icon
                      name="stair"
                      size={20}
                      className={styles.partyInfoIcon}
                    />
                    <span className={styles.partyInfoLabel}>난이도</span>
                  </div>
                  <span className={styles.partyInfoValue}>
                    {partyInfo.difficulty}
                  </span>
                </div>
                <div className={styles.partyInfoItem}>
                  <div className={styles.partyInfoLabelWrapper}>
                    <Icon
                      name="joystick-alt"
                      size={20}
                      className={styles.partyInfoIcon}
                    />
                    <span className={styles.partyInfoLabel}>컨트롤 수준</span>
                  </div>
                  <span className={styles.partyInfoValue}>
                    {partyInfo.control_level}
                  </span>
                </div>
                <div className={styles.partyInfoItem}>
                  <div className={styles.partyInfoLabelWrapper}>
                    <Icon
                      name="mic"
                      size={20}
                      className={styles.partyInfoIcon}
                    />
                    <span className={styles.partyInfoLabel}>보이스챗</span>
                  </div>
                  <span className={styles.partyInfoValue}>
                    {partyInfo.voice_chat || '없음'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 파티원 섹션 */}
          <div className={styles.membersSection}>
            <h3 className={styles.membersTitle}>파티원</h3>
            <div className={styles.membersList}>
              {reviewRequests.map((request) => {
                const isPending = request.status === 'pending';
                const isHighlighted = highlightReviewRequestId === request.id;
                const isSelected = selectedTargetId === request.target_id;
                const isSelf = user?.id === request.target_id; // 본인 여부

                return (
                  <div
                    key={request.id}
                    className={`${styles.memberCard} ${
                      isHighlighted ? styles.highlighted : ''
                    } ${isSelected ? styles.selected : ''} ${
                      !isPending ? styles.completed : ''
                    } ${isSelf ? styles.self : ''}`}
                  >
                    <Avatar
                      imageUrl={request.target_user?.avatar_url ?? undefined}
                      animalType={
                        (request.target_user?.animal_type as AnimalType) ??
                        undefined
                      }
                      size="s"
                      showStatus={false}
                      className={styles.memberAvatar}
                    />
                    <div className={styles.memberContent}>
                      <div className={styles.memberNameWrapper}>
                        <span
                          className={`${styles.memberNickname} ${
                            isSelf ? styles.selfNickname : ''
                          }`}
                        >
                          {request.target_user?.nickname || '알 수 없음'}
                        </span>
                        {leaderMap.get(request.target_id) && (
                          <Tag style="duotone">파티장</Tag>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="s"
                        disabled={!isPending || isSelf}
                        onClick={() => {
                          if (isPending && !isSelf) {
                            onSelectMember(request.target_id);
                          }
                        }}
                      >
                        {isPending && !isSelf
                          ? '후기작성'
                          : isPending && isSelf
                            ? ''
                            : '작성완료'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className={styles.footer}>
          <Button
            variant="secondary"
            size="m"
            shape="rectangle"
            onClick={onClose}
            disabled={isSubmitting}
            className={styles.cancelButton}
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="m"
            shape="rectangle"
            onClick={onClose}
            disabled={isSubmitting}
            className={styles.confirmButton}
          >
            확인
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
}

'use client';

import React from 'react';
import styles from './styles.module.css';
import Avatar from '@/commons/components/avatar';
import Button from '@/commons/components/button';
import Tag from '@/commons/components/tag';
import { AnimalType } from '@/commons/constants/animal';
import type { MatchReasonCoreDTO } from '@/commons/types/match/matchReasonCore.dto';
import type { MatchTagCoreDTO } from '@/commons/types/match/matchTagCore.dto';
import { buildMatchExplanationVM } from '@/viewmodels/match/buildMatchExplanationVM';

export interface MatchCardProps {
  /**
   * 사용자 ID
   */
  userId: string;
  /**
   * 사용자 닉네임
   */
  nickname: string;
  /**
   * 매칭률 (0-100)
   */
  matchRate: number;
  /**
   * 사용자 온라인 상태 (user_status 테이블의 status)
   */
  status?: 'online' | 'away' | 'dnd' | 'offline';
  /**
   * 아바타 이미지 URL (getAvatarImagePath로 계산된 경로)
   */
  avatarUrl?: string;
  /**
   * 동물 타입 (하위 호환성, avatarUrl이 우선)
   */
  animalType?: string;
  /**
   * 태그 목록 (하위 호환용)
   */
  tags: string[];
  /**
   * 매칭 이유 (CoreDTO)
   */
  reasons: MatchReasonCoreDTO[];
  /**
   * 매칭 태그 (CoreDTO)
   */
  tagsV2: MatchTagCoreDTO[];
  /**
   * Steam 연동 여부 (태그 강조도 계산용)
   */
  isSteamConnected: boolean;
  /**
   * 프로필 보기 버튼 클릭 핸들러
   */
  onProfileClick?: () => void;
  /**
   * 프로필이 열려있는지 여부
   */
  isProfileOpen?: boolean;
  /**
   * 추가 클래스명
   */
  className?: string;
}

export default function MatchCard({
  userId: _userId,
  nickname,
  matchRate,
  status = 'online',
  avatarUrl,
  animalType,
  tags,
  reasons,
  tagsV2,
  isSteamConnected,
  onProfileClick,
  isProfileOpen = false,
  className = '',
}: MatchCardProps) {
  const containerClasses = [styles.container, className]
    .filter(Boolean)
    .join(' ');

  // ViewModel 생성
  const explanationVM = buildMatchExplanationVM(reasons, tagsV2, {
    variant: 'list',
    isSteamConnected,
  });

  return (
    <div className={containerClasses}>
      <div className={styles.content}>
        {/* 아바타 및 사용자 정보 섹션 */}
        <div className={styles.userSection}>
          {/* 아바타 */}
          <div className={styles.avatarWrapper}>
            <Avatar
              imageUrl={avatarUrl}
              animalType={animalType as AnimalType}
              alt={nickname}
              size="m"
              status={status}
              showStatus={true}
              className={styles.avatar}
            />
          </div>

          {/* 닉네임 및 매칭률 */}
          <div className={styles.userInfo}>
            <div className={styles.nameSection}>
              <h3 className={styles.nickname}>{nickname}</h3>
              <div className={styles.matchRate}>
                <span className={styles.matchRateLabel}>매칭률</span>
                <span className={styles.matchRateValue}>{matchRate}%</span>
              </div>
            </div>

            {/* 태그 목록 */}
            <div className={styles.tagContainer}>
              {explanationVM.tags.map((tag, index) => (
                <Tag key={index} style="duotone" className={styles.tag}>
                  {tag.label}
                </Tag>
              ))}
            </div>
          </div>
        </div>

        {/* 프로필 보기 버튼 */}
        <Button
          variant="secondary"
          size="m"
          shape="round"
          className={styles.button}
          onClick={onProfileClick}
        >
          {isProfileOpen ? '프로필 닫기' : '프로필 보기'}
        </Button>
      </div>
    </div>
  );
}

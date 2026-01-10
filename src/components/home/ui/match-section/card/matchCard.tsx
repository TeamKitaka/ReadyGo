'use client';

import React from 'react';
import styles from './styles.module.css';
import Avatar from '@/commons/components/avatar';
import Button from '@/commons/components/button';
import Icon, { IconName } from '@/commons/components/icon';
import { useSideProfilePanel } from '@/hooks/useSideProfilePanel';
import { AnimalType } from '@/commons/constants/animal';

export interface MatchPreference {
  icon: IconName;
  label: string;
  value: string;
}

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
   * 사용자 온라인 상태
   */
  status?: 'online' | 'away' | 'dnd' | 'offline';
  /**
   * 동물 타입
   */
  animalType?: string;
  /**
   * 질문 텍스트
   */
  question?: string;
  /**
   * 매칭 이유 (동적으로 생성된 preferences)
   */
  preferences?: MatchPreference[];
  /**
   * 추가 클래스명
   */
  className?: string;
  /**
   * @deprecated 대신 preferences 사용
   */
  gamePreference?: string;
  /**
   * @deprecated 대신 preferences 사용
   */
  playTime?: string;
  /**
   * @deprecated 대신 preferences 사용
   */
  skillLevel?: string;
}

export default function MatchCard({
  userId,
  nickname,
  matchRate,
  status = 'online',
  animalType,
  question = '왜 이 친구와 잘 맞나요?',
  preferences = [],
  className = '',
}: MatchCardProps) {
  const { toggleProfile, isOpen, targetUserId } = useSideProfilePanel();
  const isActive = isOpen && targetUserId === userId;

  const containerClasses = [styles.container, className]
    .filter(Boolean)
    .join(' ');

  const hasPreferences = preferences.length > 0;

  const handleProfileClick = () => {
    toggleProfile(userId);
  };

  return (
    <div className={containerClasses}>
      <div className={styles.content}>
        {/* 아바타 및 사용자 정보 섹션 */}
        <div className={styles.userSection}>
          {/* 아바타 */}
          <div className={styles.avatarWrapper}>
            <Avatar
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
            <h3 className={styles.nickname}>{nickname}</h3>
            <div className={styles.matchRate}>
              <span className={styles.matchRateLabel}>매칭률</span>
              <span className={styles.matchRateValue}>{matchRate}%</span>
            </div>
          </div>
        </div>

        {/* 질문 및 선호도 섹션 */}
        {(question || hasPreferences) && (
          <div className={styles.questionSection}>
            {question && <p className={styles.questionText}>{question}</p>}
            {hasPreferences && (
              <div className={styles.preferencesSection}>
                {preferences.map((preference, index) => (
                  <div key={index} className={styles.preferenceItem}>
                    <div className={styles.preferenceIcon}>
                      <Icon
                        name={preference.icon}
                        size={20}
                        className={styles.iconWrapper}
                      />
                      <span className={styles.preferenceLabel}>
                        {preference.label}
                      </span>
                    </div>
                    <span className={styles.preferenceValue}>
                      {preference.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 프로필 보기 버튼 */}
        <Button
          variant="secondary"
          size="m"
          shape="round"
          className={styles.button}
          onClick={handleProfileClick}
        >
          {isActive ? '프로필 닫기' : '프로필 보기'}
        </Button>
      </div>
    </div>
  );
}

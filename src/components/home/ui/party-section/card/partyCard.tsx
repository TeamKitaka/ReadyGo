'use client';

import React from 'react';
import styles from './styles.module.css';
import Avatar from '@/commons/components/avatar';
import Button from '@/commons/components/button';
import Tag from '@/commons/components/tag';
import { AnimalType } from '@/commons/constants/animal';
import { usePartyNavigation } from '@/hooks/usePartyNavigation';

export interface PartyMember {
  /**
   * 멤버 동물 타입
   */
  animalType?: string;
  /**
   * 멤버 닉네임
   */
  nickname: string;
}

export interface PartyCardProps {
  /**
   * 파티 게시글 ID
   */
  postId: string | number;
  /**
   * 파티 제목
   */
  title: string;
  /**
   * 게임 이름
   */
  gameName: string;
  /**
   * 설명 텍스트
   */
  description: string;
  /**
   * 현재 참여 인원
   */
  currentMembers: number;
  /**
   * 최대 인원
   */
  maxMembers: number;
  /**
   * 멤버 목록 (최대 3명까지 표시)
   */
  members: PartyMember[];
  /**
   * 태그 목록
   */
  tags: string[];
  /**
   * 참여하기 버튼 클릭 핸들러
   */
  onJoinClick?: () => void;
  /**
   * 추가 클래스명
   */
  className?: string;
}

export default function PartyCard({
  postId,
  title,
  gameName,
  description,
  currentMembers,
  maxMembers,
  members,
  tags,
  onJoinClick,
  className = '',
}: PartyCardProps) {
  const { navigateToPartyDetail } = usePartyNavigation();

  const containerClasses = [styles.container, className]
    .filter(Boolean)
    .join(' ');

  // 표시할 멤버 (최대 3명)
  const displayMembers = members.slice(0, 3);
  // 나머지 인원
  const remainingMembers = members.length > 3 ? members.length - 3 : 0;

  // 상세보기 버튼 클릭 핸들러
  const handleDetailClick = () => {
    onJoinClick?.();
    navigateToPartyDetail(postId);
  };

  return (
    <div className={containerClasses}>
      <div className={styles.content}>
        {/* 상단: 제목 및 게임 태그 */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h3 className={styles.title}>{title}</h3>
          </div>
          <div className={styles.gameTag}>
            <Tag style="duotone">{gameName}</Tag>
          </div>
        </div>

        {/* 설명 */}
        <div className={styles.description}>{description}</div>

        {/* 멤버 아바타 및 인원수 */}
        <div className={styles.membersSection}>
          <div className={styles.avatarContainer}>
            {displayMembers.map((member, index) => (
              <div
                key={index}
                className={styles.avatarWrapper}
                style={{ zIndex: displayMembers.length - index }}
              >
                <Avatar
                  animalType={member.animalType as AnimalType}
                  alt={member.nickname}
                  size="s"
                  showStatus={false}
                  className={styles.avatar}
                />
              </div>
            ))}
            {remainingMembers > 0 && (
              <div className={styles.remainingCount}>+{remainingMembers}</div>
            )}
          </div>
          <div className={styles.memberCount}>
            <span className={styles.currentCount}>{currentMembers}</span>
            <span className={styles.maxCount}> / {maxMembers}명</span>
          </div>
        </div>

        {/* 하단: 태그 및 참여하기 버튼 */}
        <div className={styles.footer}>
          <div className={styles.tagContainer}>
            {tags.map((tag, index) => (
              <Tag key={index} style="rectangle">
                {tag}
              </Tag>
            ))}
          </div>
          <Button
            variant="primary"
            size="m"
            shape="round"
            className={styles.joinButton}
            onClick={handleDetailClick}
          >
            상세보기
          </Button>
        </div>
      </div>
    </div>
  );
}

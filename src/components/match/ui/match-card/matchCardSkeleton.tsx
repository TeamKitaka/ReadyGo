'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import styles from './matchCardSkeleton.module.css';

export interface MatchCardSkeletonProps {
  /**
   * 추가 클래스명
   */
  className?: string;
}

export default function MatchCardSkeleton({
  className = '',
}: MatchCardSkeletonProps) {
  const containerClasses = [styles.skeletonCard, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <div className={styles.content}>
        {/* 사용자 정보 섹션 */}
        <div className={styles.userSection}>
          {/* 아바타 */}
          <div className={styles.avatarWrapper}>
            <Skeleton className={styles.avatar} />
          </div>

          {/* 닉네임 및 매칭률 */}
          <div className={styles.userInfo}>
            <div className={styles.nameSection}>
              <Skeleton className={styles.nickname} />
              <div className={styles.matchRate}>
                <Skeleton className={styles.matchRateLabel} />
                <Skeleton className={styles.matchRateValue} />
              </div>
            </div>

            {/* 태그 목록 */}
            <div className={styles.tagContainer}>
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className={styles.tag} />
              ))}
            </div>
          </div>
        </div>

        {/* 프로필 보기 버튼 */}
        <Skeleton className={styles.button} />
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import styles from './matchListSkeleton.module.css';
import MatchCardSkeleton from '@/components/match/ui/match-card/matchCardSkeleton';

export interface MatchListSkeletonProps {
  /**
   * 추가 클래스명
   */
  className?: string;
  /**
   * side-panel이 열려있는지 여부
   */
  isSidePanelOpen?: boolean;
}

export default function MatchListSkeleton({
  className = '',
  isSidePanelOpen = false,
}: MatchListSkeletonProps) {
  const containerClasses = [styles.skeletonContainer, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      {/* 필터 섹션 스켈레톤 */}
      <div className={styles.filterSection}>
        <div className={styles.filterGroup}>
          <Skeleton className={`${styles.selectbox} ${styles.selectboxFirst}`} />
          <Skeleton className={`${styles.selectbox} ${styles.selectboxSecond}`} />
        </div>
        <Skeleton className={styles.refreshButton} />
      </div>

      {/* 매치 카드 그리드 */}
      <div
        className={`${styles.grid} ${isSidePanelOpen ? styles.gridWithPanel : ''}`}
      >
        {Array.from({ length: 12 }).map((_, index) => (
          <MatchCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}


'use client';

import React from 'react';
import styles from './styles.module.css';
import PartyCard, { PartyCardProps } from './card/partyCard';

export interface PartySectionProps {
  /**
   * 섹션 제목
   */
  title?: string;
  /**
   * 파티 카드 목록
   */
  parties: PartyCardProps[];
  /**
   * 추가 클래스명
   */
  className?: string;
}

export default function PartySection({
  title = '너만 오면 ㄱ!🔥 ',
  parties,
  className = '',
}: PartySectionProps) {
  const containerClasses = [styles.container, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      {/* 섹션 제목 */}
      <div className={styles.heading}>
        <h2 className={styles.headingText}>{title}</h2>
      </div>

      {/* 파티 카드 그리드 */}
      <div className={styles.gridContainer}>
        {parties.map((party, index) => (
          <PartyCard key={index} {...party} />
        ))}
      </div>
    </div>
  );
}

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
  const renderTitleWithMonaEmoji = (text: string) =>
    text.split(/(🎲|🔥)/g).map((part, index) => {
      if (part === '🎲' || part === '🔥') {
        return (
          <span key={`emoji-${index}`} className={styles.monaEmoji}>
            {part}
          </span>
        );
      }

      return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
    });

  const containerClasses = [styles.container, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      {/* 섹션 제목 */}
      <div className={styles.heading}>
        <h2 className={styles.headingText}>
          {renderTitleWithMonaEmoji(title)}
        </h2>
      </div>

      {/* 파티 카드 그리드 */}
      <div className={styles.gridContainer}>
        {parties.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            현재 참여 가능한 파티가 없습니다.
          </div>
        ) : (
          parties.map((party, index) => <PartyCard key={index} {...party} />)
        )}
      </div>
    </div>
  );
}

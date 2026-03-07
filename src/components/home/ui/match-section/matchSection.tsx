'use client';

import React from 'react';
import styles from './styles.module.css';
import MatchCard, { MatchCardProps } from './card/matchCard';

export interface MatchSectionProps {
  /**
   * 섹션 제목
   */
  title?: string;
  /**
   * 매치 카드 목록
   */
  matches: MatchCardProps[];
  /**
   * 추가 클래스명
   */
  className?: string;
}

export default function MatchSection({
  title = '레전드 조합, ㄹㄷ? 🎲',
  matches,
  className = '',
}: MatchSectionProps) {
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

      {/* 매치 카드 그리드 */}
      <div className={styles.gridContainer}>
        {matches.map((match) => (
          <MatchCard key={match.userId} {...match} />
        ))}
      </div>
    </div>
  );
}

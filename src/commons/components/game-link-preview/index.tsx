'use client';

import React from 'react';
import Button from '@/commons/components/button';
import Icon from '@/commons/components/icon';
import styles from './styles.module.css';

export type GameInfo = {
  app_id: number;
  name: string | null;
  header_image: string | null;
  short_description: string | null;
  isLoading: boolean;
};

export interface GameLinkPreviewProps {
  gameInfo: GameInfo | null;
  appId: number;
  onGameStart: () => void;
}

/**
 * 게임 링크 미리보기 카드 컴포넌트
 *
 * 책임:
 * - 게임 이미지, 이름, 설명 표시
 * - "게임 바로 시작" 버튼 포함
 * - 로딩 상태 표시
 */
export default function GameLinkPreview({
  gameInfo,
  appId: _appId,
  onGameStart,
}: GameLinkPreviewProps) {
  if (gameInfo?.isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>게임 정보 로딩 중...</p>
      </div>
    );
  }

  if (!gameInfo || !gameInfo.name) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* 게임 이미지 */}
      {gameInfo.header_image && (
        <div
          className={styles.imageContainer}
          style={{
            backgroundImage: `url(${gameInfo.header_image})`,
          }}
        />
      )}
      {/* 게임 정보 */}
      <div className={styles.content}>
        <h3 className={styles.title}>{gameInfo.name || '게임 정보 없음'}</h3>
        {gameInfo.short_description && (
          <p className={styles.description}>{gameInfo.short_description}</p>
        )}
        {/* 게임 바로 시작 버튼 */}
        <Button
          variant="primary"
          size="m"
          shape="rectangle"
          onClick={onGameStart}
          className={styles.gameStartButton}
        >
          <Icon name="gamepad" size={20} />
          게임 바로 시작
        </Button>
      </div>
    </div>
  );
}

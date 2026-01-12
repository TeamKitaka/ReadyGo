'use client';

import React from 'react';
import Button from '@/commons/components/button';
import Icon from '@/commons/components/icon';
import styles from './styles.module.css';

export interface SteamProfileLinkPreviewProps {
  steamId: string;
  nickname?: string;
  onProfileView: () => void;
}

/**
 * Steam 프로필 링크 미리보기 컴포넌트
 *
 * 책임:
 * - Steam 프로필 아이콘/이미지 표시
 * - "Steam 프로필 보기" 버튼 포함
 * - 1:1 채팅과 파티 채팅 모두에서 사용
 */
export default function SteamProfileLinkPreview({
  steamId: _steamId,
  nickname,
  onProfileView,
}: SteamProfileLinkPreviewProps) {
  const displayNickname = nickname || '사용자';
  const title = `${displayNickname} Steam 프로필`;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.textContainer}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>
            Steam 친구 추가하고 같이 게임을 시작해 보세요
          </p>
        </div>
        {/* Steam 프로필 보기 버튼 */}
        <Button
          variant="primary"
          size="m"
          shape="rectangle"
          onClick={onProfileView}
          className={styles.profileViewButton}
        >
          <Icon name="steam" size={20} />
          Steam 프로필 보기
        </Button>
      </div>
    </div>
  );
}

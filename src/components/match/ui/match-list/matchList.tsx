'use client';

import React from 'react';
import styles from './styles.module.css';
import MatchCard from '@/components/match/ui/match-card/matchCard';
import Selectbox, { SelectboxItem } from '@/commons/components/selectbox';
import Button from '@/commons/components/button';
import Icon from '@/commons/components/icon';
import {
  matchRateOptions,
  statusOptions,
} from '@/components/match/constants/filterOptions';
import { MatchData } from '@/components/match/types/match.types';
import { getEffectiveStatus } from '@/stores/user-status.store';

export interface MatchListProps {
  /**
   * 매치 데이터 목록
   */
  matches: MatchData[];
  /**
   * 선택된 매칭률 필터 ID
   */
  selectedMatchRate: string;
  /**
   * 선택된 온라인 상태 필터 ID
   */
  selectedStatus: string;
  /**
   * side-panel이 열려있는지 여부
   */
  isSidePanelOpen: boolean;
  /**
   * 현재 열려있는 프로필의 userId
   */
  activeProfileUserId?: string;
  /**
   * Steam 연동 여부 (태그 강조도 계산용)
   */
  isSteamConnected: boolean;
  /**
   * 매칭률 필터 변경 핸들러
   */
  onMatchRateChange: (item: SelectboxItem) => void;
  /**
   * 온라인 상태 필터 변경 핸들러
   */
  onStatusChange: (item: SelectboxItem) => void;
  /**
   * 목록 갱신 버튼 클릭 핸들러
   */
  onRefresh: () => void;
  /**
   * 프로필 보기 버튼 클릭 핸들러
   */
  onProfileClick: (userId: string) => void;
}

export default function MatchList({
  matches,
  selectedMatchRate,
  selectedStatus,
  isSidePanelOpen,
  activeProfileUserId,
  isSteamConnected,
  onMatchRateChange,
  onStatusChange,
  onRefresh,
  onProfileClick,
}: MatchListProps) {
  return (
    <div className={styles.container}>
      {/* 필터 섹션 */}
      <div className={styles.filterSection}>
        <div className={styles.filterGroup}>
          <Selectbox
            items={matchRateOptions}
            selectedId={selectedMatchRate}
            onSelect={onMatchRateChange}
            placeholder="매칭률 75% 이상"
            className={styles.selectbox}
          />
          <Selectbox
            items={statusOptions}
            selectedId={selectedStatus}
            onSelect={onStatusChange}
            placeholder="모든 접속 상태"
            className={styles.selectbox}
          />
        </div>
        <Button
          variant="primary"
          size="m"
          shape="rectangle"
          className={styles.refreshButton}
          onClick={onRefresh}
        >
          <Icon name="refresh" size={20} />
          <span>목록갱신</span>
        </Button>
      </div>

      {/* 매치 카드 그리드 */}
      <div
        className={`${styles.grid} ${isSidePanelOpen ? styles.gridWithPanel : ''}`}
      >
        {matches.map((match) => {
          // Presence 기반 실시간 접속 상태 가져오기
          const effectiveStatus = getEffectiveStatus(match.userId);

          return (
            <MatchCard
              key={match.id}
              userId={match.userId}
              nickname={match.nickname}
              matchRate={match.matchRate}
              status={effectiveStatus}
              avatarUrl={match.avatarUrl}
              tags={match.tags}
              reasons={match.reasons}
              tagsV2={match.tagsV2}
              isSteamConnected={isSteamConnected}
              onProfileClick={() => onProfileClick(match.userId)}
              isProfileOpen={activeProfileUserId === match.userId}
            />
          );
        })}
      </div>
    </div>
  );
}

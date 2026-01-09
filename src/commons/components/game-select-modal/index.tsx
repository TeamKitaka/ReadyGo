'use client';

import React, { useRef, useEffect } from 'react';
import OverlayContainer from '@/commons/components/overlay';
import Searchbar from '@/commons/components/searchbar';
import Button from '@/commons/components/button';
import Icon from '@/commons/components/icon';
import styles from './styles.module.css';

export type SteamGame = {
  app_id: number;
  name: string;
};

export interface GameSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (game: SteamGame) => void;
  games: SteamGame[];
  filteredGames: SteamGame[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGame: SteamGame | null;
  onSelectGame: (game: SteamGame) => void;
  error: string | null;
}

/**
 * 게임 선택 모달 컴포넌트
 *
 * 책임:
 * - 게임 검색 및 선택 기능
 * - 확인/취소 버튼
 * - overlay와 함께 모달로 표시
 */
export default function GameSelectModal({
  isOpen,
  onClose,
  onConfirm,
  games,
  filteredGames,
  isLoading,
  searchQuery,
  onSearchChange,
  selectedGame,
  onSelectGame,
  error,
}: GameSelectModalProps) {
  const searchRef = useRef<HTMLDivElement>(null);
  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOptionsOpen(false);
      }
    };

    if (isOptionsOpen && isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOptionsOpen, isOpen]);

  // 검색어 변경 시 옵션 표시
  useEffect(() => {
    if (searchQuery.length > 0 && !isLoading && filteredGames.length > 0) {
      setIsOptionsOpen(true);
    } else {
      setIsOptionsOpen(false);
    }
  }, [searchQuery, isLoading, filteredGames.length]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (selectedGame) {
      onConfirm(selectedGame);
    }
  };

  const handleGameSelect = (game: SteamGame) => {
    onSelectGame(game);
    setIsOptionsOpen(false);
  };

  return (
    <OverlayContainer onClose={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>게임 선택</h2>
          <button
            className={styles.closeButton}
            type="button"
            onClick={onClose}
            aria-label="닫기"
          >
            <Icon name="x" size={24} />
          </button>
        </div>

        <div className={styles.body}>
          <div
            className={`${styles.searchWrapper} ${
              isOptionsOpen && filteredGames.length > 0
                ? styles.searchWrapperWithDropdown
                : ''
            }`}
            ref={searchRef}
          >
            <Searchbar
              size="l"
              icon="right"
              placeholder="게임 검색"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => {
                if (
                  searchQuery.length > 0 &&
                  !isLoading &&
                  filteredGames.length > 0
                ) {
                  setIsOptionsOpen(true);
                }
              }}
            />
            {isOptionsOpen && filteredGames.length > 0 && (
              <div className={styles.gameOptionsGroup}>
                {filteredGames.map((game) => {
                  const isSelected = selectedGame?.app_id === game.app_id;
                  return (
                    <div
                      key={game.app_id}
                      className={`${styles.gameOptionItem} ${
                        isSelected ? styles.selected : ''
                      }`}
                      onClick={() => handleGameSelect(game)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {isSelected && (
                        <span className={styles.checkIcon}>
                          <Icon name="check" size={20} />
                        </span>
                      )}
                      <span className={styles.gameOptionValue}>{game.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {error && <span className={styles.errorMessage}>{error}</span>}
            {isLoading && (
              <p className={styles.loadingText}>게임 목록을 불러오는 중...</p>
            )}
          </div>

          {selectedGame && (
            <div className={styles.selectedGame}>
              <p className={styles.selectedGameLabel}>선택된 게임:</p>
              <p className={styles.selectedGameName}>{selectedGame.name}</p>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <Button
            variant="secondary"
            size="m"
            shape="rectangle"
            onClick={onClose}
            className={styles.cancelButton}
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="m"
            shape="rectangle"
            onClick={handleConfirm}
            disabled={!selectedGame}
            className={styles.confirmButton}
          >
            확인
          </Button>
        </div>
      </div>
    </OverlayContainer>
  );
}


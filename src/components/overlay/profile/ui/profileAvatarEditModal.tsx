'use client';

import { useMemo, useState } from 'react';
import Avatar from '@/commons/components/avatar';
import Icon from '@/commons/components/icon';
import {
  AnimalType,
  getAnimalAssets,
  getAllAnimalTypes,
} from '@/commons/constants/animal';
import styles from './profileAvatarEditModal.module.css';

interface ProfileAvatarEditModalProps {
  onClose?: () => void;
  currentAvatarImagePath: string;
  onSelectAvatar?: (avatarImagePath: string) => void;
}

const PAGE_SIZE = 8;

export default function ProfileAvatarEditModal({
  onClose,
  currentAvatarImagePath,
  onSelectAvatar,
}: ProfileAvatarEditModalProps) {
  const [page, setPage] = useState(0);

  const animalTypes = useMemo(
    () => getAllAnimalTypes().filter((type) => type !== AnimalType.unknown),
    []
  );

  const pageCount = Math.ceil(animalTypes.length / PAGE_SIZE);
  const pageStart = page * PAGE_SIZE;
  const visibleTypes = animalTypes.slice(pageStart, pageStart + PAGE_SIZE);

  const selectedAnimalType = useMemo(() => {
    return animalTypes.find(
      (type) => getAnimalAssets(type).avatar === currentAvatarImagePath
    );
  }, [animalTypes, currentAvatarImagePath]);

  const handlePrevPage = () => {
    setPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(pageCount - 1, prev + 1));
  };

  const handleSelectAvatar = (animalType: AnimalType) => {
    const selectedAvatarPath = getAnimalAssets(animalType).avatar;
    onSelectAvatar?.(selectedAvatarPath);
    onClose?.();
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="아바타 수정 모달 닫기"
      >
        <Icon name="x" size={16} />
      </button>

      <div className={styles.content}>
        <p className={styles.title}>아바타 선택</p>

        <div className={styles.selectorRow}>
          <button
            type="button"
            className={styles.navButton}
            onClick={handlePrevPage}
            disabled={page === 0}
            aria-label="이전 아바타 페이지"
          >
            <Icon name="chevron-left" size={32} />
          </button>

          <div className={styles.avatarGrid}>
            {visibleTypes.map((animalType) => {
              const isSelected = selectedAnimalType === animalType;
              return (
                <button
                  key={animalType}
                  type="button"
                  className={`${styles.avatarItem} ${isSelected ? styles.avatarItemSelected : ''}`}
                  aria-label={`${animalType} 아바타 선택`}
                  onClick={() => handleSelectAvatar(animalType)}
                >
                  <Avatar
                    imageUrl={getAnimalAssets(animalType).avatar}
                    size="m"
                    showStatus={false}
                  />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.navButton}
            onClick={handleNextPage}
            disabled={page === pageCount - 1}
            aria-label="다음 아바타 페이지"
          >
            <Icon name="chevron-right" size={32} />
          </button>
        </div>
      </div>
    </div>
  );
}

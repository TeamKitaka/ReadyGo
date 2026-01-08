'use client';

import React, { useState } from 'react';
import styles from './styles.module.css';
import { AnimalType, getAnimalAssets } from '@/commons/constants/animal';

export type AvatarSize = 's' | 'm' | 'L';
export type AvatarStatus = 'online' | 'away' | 'dnd' | 'offline';

export interface AvatarProps {
  /**
   * 아바타 이미지 URL (우선순위 1)
   * 유틸리티 함수(getAvatarImagePath)에서 계산된 최종 이미지 경로를 전달
   */
  imageUrl?: string;
  /**
   * 동물 타입 (우선순위 2, imageUrl이 없을 때 사용)
   * 하위 호환성을 위해 유지
   */
  animalType?: AnimalType;
  alt?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  showStatus?: boolean;
  className?: string;
  /**
   * 아바타 색상 (CSS color 값)
   * @default 'var(--color-icon-primary)'
   * @example '#FF6B6B', 'rgb(255, 107, 107)', 'var(--color-icon-secondary)'
   */
  color?: string;
}

export default function Avatar({
  imageUrl,
  animalType,
  size = 'm',
  status = 'offline',
  showStatus = true,
  className = '',
  color = 'var(--color-icon-primary)',
}: AvatarProps) {
  const [imageError] = useState(false);
  const defaultImage = '/images/bird.svg';

  // 이미지 경로 결정: imageUrl > animalType > defaultImage
  // 우선순위 분별은 유틸리티 함수(getAvatarImagePath)에서 처리하므로,
  // 여기서는 imageUrl이 있으면 우선 사용하고, 없으면 기존 로직 유지
  let imageSrc = defaultImage;
  if (imageUrl) {
    imageSrc = imageUrl;
  } else if (animalType && !imageError) {
    const animalAssets = getAnimalAssets(animalType);
    imageSrc = animalAssets.avatar;
  }

  // unknown 아바타인지 확인 (imageUrl 또는 animalType으로 판단)
  const isUnknownAvatar =
    imageSrc.includes('unknown.svg') ||
    animalType === AnimalType.unknown;

  const wrapperClasses = [styles.wrapper, styles[`size-${size}`], className]
    .filter(Boolean)
    .join(' ');

  const imageContainerClasses = [
    styles.imageContainer,
    styles.colorFilter,
    isUnknownAvatar ? styles.unknownAvatar : '',
  ]
    .filter(Boolean)
    .join(' ');

  const statusDotClasses = [
    styles.statusDot,
    styles[`status-${status}`],
    styles[`size-${size}`],
  ]
    .filter(Boolean)
    .join(' ');

  const getStatusLabel = () => {
    switch (status) {
      case 'online':
        return '온라인';
      case 'away':
        return '자리비움';
      case 'dnd':
        return '방해 금지';
      case 'offline':
        return '오프라인';
      default:
        return '';
    }
  };

  return (
    <div className={wrapperClasses}>
      <div
        className={imageContainerClasses}
        style={
          {
            '--avatar-color': color,
            '--mask-image': `url(${imageSrc})`,
          } as React.CSSProperties
        }
      >
        {/* 항상 mask 방식으로 색상 적용 */}
        <div
          className={styles.image}
          style={{
            WebkitMaskImage: `url(${imageSrc})`,
            maskImage: `url(${imageSrc})`,
            backgroundColor: color,
          }}
        />
      </div>
      {showStatus && (
        <div className={statusDotClasses} aria-label={getStatusLabel()} />
      )}
    </div>
  );
}

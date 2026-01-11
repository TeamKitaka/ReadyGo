'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './styles.module.css';
import { HTMLAttributes } from 'react';
import TierTag from '../tier-tag';
import Icon from '../icon';
import Dropdown from '../dropdown';
import { TierType } from '../../constants/tierType.enum';
import { AnimalType, getAnimalTypeMeta } from '../../constants/animal';
import { URL_PATHS } from '../../constants/url';

export type AnimalCardProperty = 'my' | 'user';

export interface AnimalCardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'style'
> {
  property?: AnimalCardProperty;
  nickname: string;
  tier: TierType;
  animal: AnimalType;
  favoriteGenre?: string;
  activeTime?: string;
  gameStyle?: string;
  weeklyAverage?: string;
  perfectMatchTypes?: AnimalType[];
  matchPercentage?: number;
  matchReasons?: string[];
  onMessageClick?: () => void;
  onProfileClick?: () => void;
  onMoreClick?: () => void;
  onBlockClick?: () => void;
  onReportClick?: () => void;
  className?: string;
}

export default function AnimalCard({
  property = 'my',
  nickname,
  tier,
  animal,
  favoriteGenre = 'FPS',
  activeTime = '20 - 24시',
  gameStyle = '경쟁적',
  weeklyAverage = '5.4 시간',
  perfectMatchTypes,
  matchPercentage,
  matchReasons,
  onMessageClick,
  onProfileClick,
  onMoreClick,
  onBlockClick,
  onReportClick,
  className = '',
  ...props
}: AnimalCardProps) {
  const router = useRouter();
  const animalMeta = getAnimalTypeMeta(animal);
  const isUnknown = animal === AnimalType.unknown;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const cardClasses = [styles.animalCard, className].filter(Boolean).join(' ');

  const handleTraitsTestClick = () => {
    router.push(URL_PATHS.TRAITS);
  };

  const handleMoreClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (onMoreClick) {
      onMoreClick();
    }
  };

  const handleBlockClick = () => {
    if (onBlockClick) {
      onBlockClick();
    }
  };

  const handleReportClick = () => {
    if (onReportClick) {
      onReportClick();
    }
  };

  const dropdownItems = [
    {
      id: 'block',
      icon: 'block',
      label: '차단하기',
      onClick: handleBlockClick,
    },
    {
      id: 'report',
      icon: 'siren',
      label: '신고하기',
      onClick: handleReportClick,
    },
  ];

  return (
    <div className={cardClasses} {...props}>
      {/* Header: Nickname + Tier Tag */}
      <div className={styles.header}>
        <div className={styles.nicknameWrapper}>
          <p className={styles.nickname}>{nickname}</p>
        </div>
        {!isUnknown && <TierTag tier={tier} />}
      </div>

      {/* Animal Image */}
      <div
        className={`${styles.animalImageWrapper} ${
          isUnknown ? styles.unknownBackground : ''
        }`}
      >
        <div className={styles.backgroundImage}>
          <Image
            src="/images/background.png"
            alt=""
            fill
            className={styles.backgroundImg}
          />
        </div>
        <div className={styles.animalImage}>
          <Image
            src={animalMeta.ui.imageM}
            alt={animalMeta.label}
            width={222}
            height={222}
            className={`${styles.animalImg} ${isUnknown ? styles.unknownImage : ''}`}
          />
        </div>
      </div>

      {/* Animal Description + User Info */}
      <div className={styles.contentWrapper}>
        <div className={styles.descriptionSection}>
          {/* Animal Description */}
          <div className={styles.animalDescription}>
            <div className={styles.descriptionLabel}>
              <p className={styles.descriptionTitle}>
                {isUnknown
                  ? animalMeta.unknownDescriptions?.[property] ||
                    animalMeta.description[0]
                  : `${animalMeta.description[0]}, ${animalMeta.label}`}
              </p>
            </div>
            {!isUnknown && animalMeta.description[1] && (
              <div className={styles.descriptionText}>
                <p className={styles.descriptionSubtitle}>
                  {animalMeta.description[1]}
                </p>
              </div>
            )}
          </div>

          {/* User Info Grid */}
          <div
            className={`${styles.infoGrid} ${
              isUnknown ? styles.unknownInfoGrid : ''
            }`}
          >
            {isUnknown ? (
              <div className={styles.infoRow}>
                <div className={styles.infoItem}>
                  <div
                    className={`${styles.infoIconLabel} ${styles.unknownIcon}`}
                  >
                    <Icon name="sword-alt" size={20} className={styles.icon} />
                    <p className={styles.infoLabel}>게임 성향</p>
                  </div>
                  <p className={`${styles.infoValue} ${styles.unknownValue}`}>
                    분석 필요
                  </p>
                </div>

                <div className={styles.infoItem}>
                  <div
                    className={`${styles.infoIconLabel} ${styles.unknownIcon}`}
                  >
                    <Icon name="time" size={20} className={styles.icon} />
                    <p className={styles.infoLabel}>활동 시간</p>
                  </div>
                  <p className={`${styles.infoValue} ${styles.unknownValue}`}>
                    분석 필요
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.infoRow}>
                  <div className={styles.infoItem}>
                    <div className={styles.infoIconLabel}>
                      <Icon name="gaming" size={20} className={styles.icon} />
                      <p className={styles.infoLabel}>선호 장르</p>
                    </div>
                    <p className={styles.infoValue}>{favoriteGenre}</p>
                  </div>

                  <div className={styles.infoItem}>
                    <div className={styles.infoIconLabel}>
                      <Icon name="time" size={20} className={styles.icon} />
                      <p className={styles.infoLabel}>활동 시간</p>
                    </div>
                    <p className={styles.infoValue}>
                      {activeTime || '분석 필요'}
                    </p>
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <div className={styles.infoItem}>
                    <div className={styles.infoIconLabel}>
                      <Icon
                        name="sword-alt"
                        size={20}
                        className={styles.icon}
                      />
                      <p className={styles.infoLabel}>게임 성향</p>
                    </div>
                    <p className={styles.infoValue}>
                      {gameStyle || '분석 필요'}
                    </p>
                  </div>

                  <div className={styles.infoItem}>
                    <div className={styles.infoIconLabel}>
                      <Icon
                        name="bar-chart-square"
                        size={20}
                        className={styles.icon}
                      />
                      <p className={styles.infoLabel}>주간 평균</p>
                    </div>
                    <p className={styles.infoValue}>{weeklyAverage}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Unknown Type: Test Link Button */}
          {isUnknown && property === 'my' && (
            <div
              className={styles.testLinkButton}
              onClick={handleTraitsTestClick}
            >
              <p className={styles.testLinkText}>내 플레이 스타일 알아보기</p>
              <Icon
                name="arrow-right"
                size={20}
                className={styles.testLinkIcon}
              />
            </div>
          )}
        </div>

        {/* Perfect Match Section */}
        {property === 'my' && perfectMatchTypes && (
          <div className={styles.perfectMatchMy}>
            <div className={styles.perfectMatchHeader}>
              <Icon name="clover" size={20} className={styles.icon} />
              <p className={styles.perfectMatchLabel}>천생연분 타입</p>
            </div>
            <div className={styles.perfectMatchTypes}>
              {perfectMatchTypes.map((type, index) => (
                <React.Fragment key={type}>
                  {index > 0 && <span className={styles.separator}>·</span>}
                  <span className={styles.matchType}>
                    {getAnimalTypeMeta(type).label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {property === 'user' && matchPercentage !== undefined && (
          <div className={styles.perfectMatchUser}>
            <div className={styles.matchPercentageRow}>
              <p className={styles.matchTitle}>천생연분</p>
              <p className={styles.matchPercentage}>{matchPercentage}%</p>
            </div>
            {matchReasons && (
              <div className={styles.matchReasons}>
                {matchReasons.map((reason, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span className={styles.separator}>·</span>}
                    <span className={styles.matchReason}>{reason}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons - User Variant */}
      {property === 'user' && (
        <div className={styles.actionButtons}>
          <button className={styles.primaryButton} onClick={onMessageClick}>
            <Icon
              name="message-circle-dots"
              size={20}
              className={styles.primaryButtonIcon}
            />
            <p className={styles.primaryButtonText}>채팅하기</p>
          </button>
          <button className={styles.iconButton} onClick={onProfileClick}>
            <Icon name="add-user" size={20} className={styles.icon} />
          </button>
          <div className={styles.moreButtonWrapper}>
            <button
              ref={moreButtonRef}
              className={styles.iconButton}
              onClick={handleMoreClick}
            >
              <Icon name="more-horizontal" size={20} className={styles.icon} />
            </button>
            <Dropdown
              items={dropdownItems}
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
              anchorRef={moreButtonRef}
            />
          </div>
        </div>
      )}
    </div>
  );
}

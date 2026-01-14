'use client';

import React from 'react';
import styles from './styles.module.css';
import AnimalCard from '@/commons/components/animal-card';
import RadarChart, { RadarChartData } from '@/commons/components/radar-chart';
import BarChart, { BarChartDataItem } from '@/commons/components/bar-chart';
import { AnimalType } from '@/commons/constants/animal';
import { TierType } from '@/commons/constants/tierType.enum';

export interface ProfileSectionProps {
  // Animal Card Props
  nickname: string;
  tier: TierType;
  animal: AnimalType;
  favoriteGenre?: string;
  activeTime?: string;
  gameStyle?: string;
  weeklyAverage?: string;
  perfectMatchTypes?: AnimalType[];

  // Radar Chart Data
  radarData: RadarChartData[];

  // Bar Chart Data
  barData: BarChartDataItem[];

  className?: string;
}

export default function ProfileSection({
  nickname,
  tier,
  animal,
  favoriteGenre = '--',
  activeTime,
  gameStyle = '--',
  weeklyAverage = '--시간',
  perfectMatchTypes,
  radarData,
  barData,
  className = '',
}: ProfileSectionProps) {
  const sectionClasses = [styles.profileSection, className]
    .filter(Boolean)
    .join(' ');

  const isUnknown = animal === AnimalType.unknown;

  return (
    <div className={sectionClasses}>
      {/* Animal Card */}
      <AnimalCard
        property="my"
        nickname={nickname}
        tier={tier}
        animal={animal}
        favoriteGenre={favoriteGenre}
        activeTime={activeTime}
        gameStyle={gameStyle}
        weeklyAverage={weeklyAverage}
        perfectMatchTypes={perfectMatchTypes}
        className={styles.animalCard}
      />

      {/* Charts Container */}
      {!isUnknown && (
        <div className={styles.chartsContainer}>
          {/* Radar Chart Section */}
          <div className={styles.chartSection}>
            <div className={styles.chartHeader}>
              <h4 className={styles.chartTitle}>플레이스타일</h4>
            </div>
            <div className={styles.radarChartWrapper}>
              <RadarChart
                myData={radarData}
                size="m"
                showLabels={true}
                className={styles.radarChart}
              />
            </div>
          </div>

          {/* Bar Chart Section */}
          {barData && barData.length > 0 && (
            <div className={styles.chartSection}>
              <div className={styles.chartHeader}>
                <h4 className={styles.chartTitle}>최근 플레이 패턴</h4>
              </div>
              <div className={styles.barChartWrapper}>
                <BarChart
                  data={barData}
                  size="s"
                  showValues={true}
                  className={styles.barChart}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/commons/components/icon';
import Button from '@/commons/components/button';
import styles from './traitsAlert.module.css';

export interface TraitsAlertProps {
  /**
   * 추가 CSS 클래스
   */
  className?: string;
}

export const TraitsAlert = ({ className = '' }: TraitsAlertProps) => {
  const router = useRouter();

  const handleStartTest = () => {
    router.push('/traits');
  };

  const alertClasses = [styles.traitsAlert, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={alertClasses}>
      <div className={styles.container}>
        {/* 상단 안내 섹션 */}
        <div className={styles.infoSection}>
          <p className={styles.infoTitle}>
            정확한 게임 타입 분석과 매칭을 위해
          </p>
          <div className={styles.infoDescription}>
            <p>게임 성향 테스트로 나의 플레이 스타일을 분석하고,</p>
            <p>분석 결과를 바탕으로 나와 잘 맞는 게임 친구를 추천받아보세요.</p>
          </div>
        </div>

        {/* 구분선 */}
        <div className={styles.divider} />

        {/* 하단 기능 안내 섹션 */}
        <div className={styles.featuresSection}>
          {/* 기능 목록 */}
          <div className={styles.featuresContainer}>
            <p className={styles.featuresTitle}>분석 완료 후 사용할 수 있는 기능</p>
            <div className={styles.featuresList}>
              <div className={styles.featureItem}>
                <div className={styles.checkIcon}>
                  <Icon name="check" size={12} />
                </div>
                <p className={styles.featureText}>게임 성향 기반 친구 매칭</p>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.checkIcon}>
                  <Icon name="check" size={12} />
                </div>
                <p className={styles.featureText}>
                  플레이 스타일 분석 및 성향 테스트
                </p>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.checkIcon}>
                  <Icon name="check" size={12} />
                </div>
                <p className={styles.featureText}>활동 시간대 기반 친구 추천</p>
              </div>
            </div>
          </div>

          {/* 버튼 & 안내 문구 */}
          <div className={styles.actionSection}>
            <Button
              variant="primary"
              size="l"
              shape="round"
              onClick={handleStartTest}
              className={styles.testButton}
            >
              <Icon name="gaming" size={20} />
              게임 성향 분석 테스트하기
            </Button>
            <p className={styles.notice}>
              게임 성향 분석을 완료해야 매칭 및 추천 기능을 사용할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


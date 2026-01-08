'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/commons/components/icon';
import Button from '@/commons/components/button';
import { URL_PATHS } from '@/commons/constants/url';
import styles from './styles.module.css';

export interface StartSectionProps {
  className?: string;
}

export default function StartSection({ className = '' }: StartSectionProps) {
  const router = useRouter();

  const handleTestClick = () => {
    router.push(URL_PATHS.TRAITS);
  };

  const containerClasses = [styles.container, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <div className={styles.content}>
        {/* 왼쪽: 설명 영역 */}
        <div className={styles.descriptionSection}>
          <div className={styles.descriptionBox}>
            <h2 className={styles.title}>
              정확한 게임 타입 분석과 매칭을 위해
            </h2>
            <div className={styles.description}>
              <p>게임 성향 테스트로 나의 플레이 스타일을 분석하고,</p>
              <p>
                분석 결과를 바탕으로 나와 잘 맞는 게임 친구를 추천받아보세요.
              </p>
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div className={styles.divider} />

        {/* 오른쪽: 기능 목록 및 버튼 영역 */}
        <div className={styles.featuresSection}>
          <div className={styles.featuresList}>
            <h3 className={styles.featuresTitle}>
              분석 완료 후 사용할 수 있는 기능
            </h3>
            <ul className={styles.featuresItems}>
              <li className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <Icon name="check" size={12} />
                </div>
                <span className={styles.featureText}>
                  게임 성향 기반 친구 매칭
                </span>
              </li>
              <li className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <Icon name="check" size={12} />
                </div>
                <span className={styles.featureText}>
                  플레이 스타일 분석 및 성향 테스트
                </span>
              </li>
              <li className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <Icon name="check" size={12} />
                </div>
                <span className={styles.featureText}>
                  활동 시간대 기반 친구 추천
                </span>
              </li>
            </ul>
          </div>

          <div className={styles.actionSection}>
            <Button
              variant="primary"
              shape="rectangle"
              size="m"
              className={styles.testButton}
              onClick={handleTestClick}
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
}

'use client';

import { URL_PATHS } from '@/commons/constants/url';
import { useRouter } from 'next/navigation';
import styles from './styles.module.css';

export const HeroSection = () => {
  const router = useRouter();

  const handleStartMatching = () => {
    router.push(URL_PATHS.SIGNUP);
  };

  return (
    <section className={styles.hero}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.inner}>
        <h1 className={styles.title}>
          <span className={styles.titleLine}>당신의 완벽한 게임 파트너를</span>
          <span className={`${styles.titleLine} ${styles.titleAccent}`}>
            지금 만나보세요
          </span>
        </h1>
        <p className={styles.subtitle}>
          <span>Steam 플레이 데이터를 분석하여 당신의 플레이 스타일과</span>
          <span>완벽하게 맞는 게임 파트너를 찾아드립니다</span>
        </p>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleStartMatching}
        >
          지금 시작하기
        </button>
      </div>
    </section>
  );
};

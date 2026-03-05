'use client';

import { URL_PATHS } from '@/commons/constants/url';
import { useRouter } from 'next/navigation';
import styles from './styles.module.css';

interface MoreSectionProps {
  sectionRef: React.RefObject<HTMLDivElement>;
}

export const MoreSection = ({ sectionRef }: MoreSectionProps) => {
  const router = useRouter();
  const previewImage =
    'https://www.figma.com/api/mcp/asset/60f0dc32-9778-4155-8aae-d5753ce56176';
  const arrowIcon =
    'https://www.figma.com/api/mcp/asset/abbd439b-7674-45ce-84b4-702a577d1745';

  const handleCtaClick = () => {
    router.push(URL_PATHS.SIGNUP);
  };

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.heading}>
          <h2 className={styles.title}>내 취향에 맞는 파티, 한 번에</h2>
          <p className={styles.subtitle}>
            플레이 데이터를 분석해 만든 동물 타입 · 매칭 퍼센트 · 추천 파티를 한
            화면에서 보고, 마음에 드는 상대와 바로 채팅까지 연결합니다.
          </p>
        </div>

        <div className={styles.previewFrame}>
          <img className={styles.previewImage} src={previewImage} alt="" />
        </div>

        <button
          type="button"
          className={styles.ctaButton}
          onClick={handleCtaClick}
        >
          지금 매칭 시작하기
          <img className={styles.ctaIcon} src={arrowIcon} alt="" />
        </button>
      </div>
    </section>
  );
};

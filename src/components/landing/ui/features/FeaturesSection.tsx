'use client';

import Icon from '@/commons/components/icon';
import styles from './styles.module.css';

interface FeaturesSectionProps {
  sectionRef: React.RefObject<HTMLDivElement>;
}

export const FeaturesSection = ({ sectionRef }: FeaturesSectionProps) => {
  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.title}>
          <span>게임 플레이 데이터를 기반으로</span>
          <span className={styles.titleAccent}>
            게임 매칭을 더 똑똑하게
          </span>
        </h2>

        <div className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.iconWrap}>
              <Icon name="steam" size={28} className={styles.icon} />
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>Steam 데이터 분석</h3>
              <p className={styles.cardDesc}>
                Steam 플레이 데이터를 분석해 플레이 시간, 선호 장르, 활동 패턴
                등을 기반으로 유저의 실제 플레이 스타일을 파악합니다.
              </p>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.iconWrap}>
              <Icon name="match" size={28} className={styles.icon} />
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>동물 타입 매칭</h3>
              <p className={styles.cardDesc}>
                게임 플레이 스타일을 동물 캐릭터로 시각화하고 비슷한 타입의
                플레이어를 쉽게 찾을 수 있습니다.
              </p>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.iconWrap}>
              <Icon name="bar-chart-square" size={28} className={styles.icon} />
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>매칭 퍼센트</h3>
              <p className={styles.cardDesc}>
                플레이 성향을 기반으로 매칭 퍼센트를 제공해 가장 잘 맞는
                파트너를 한눈에 확인할 수 있습니다.
              </p>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.iconWrap}>
              <Icon
                name="message-circle-dots"
                size={28}
                className={styles.icon}
              />
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>실시간 채팅</h3>
              <p className={styles.cardDesc}>
                매칭된 플레이어와 바로 대화하세요. 실시간 채팅으로 파티를 만들고
                함께 게임을 시작할 수 있습니다.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

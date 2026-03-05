'use client';

import styles from './styles.module.css';

interface ServiceSectionProps {
  sectionRef: React.RefObject<HTMLDivElement>;
}

export const ServiceSection = ({ sectionRef }: ServiceSectionProps) => {
  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.badge}>OUR SERVICE</div>
        <div className={styles.heading}>
          <h2 className={styles.title}>
            <span>게임 플레이 성향 분석으로</span>
            <span>나와 딱 맞는 플레이어를 찾다</span>
          </h2>
          <p className={styles.subtitle}>
            <span>
              멀티플레이 게임은 넘쳐나지만, 함께 게임하기 편한 사람을 찾는
              일은 여전히 어렵습니다.
            </span>
            <span>
              단순한 게임 목록이나 장르가 아니라 실제 플레이 데이터와 행동
              패턴을 기반으로 더 편한 게임 친구를 찾는 경험을 제공합니다.
            </span>
          </p>
        </div>

        <div className={styles.cards}>
          <article className={styles.card}>
            <h3 className={styles.cardTitle}>
              플레이 데이터 기반 성향 분석
            </h3>
            <p className={styles.cardDesc}>
              <span>
                Steam API를 통해 유저의 플레이 데이터를 수집하고 게임 플레이
                시간, 장르 선호, 활동 패턴 등을 분석해 유저의 게임 성향을
                정량적으로 파악합니다.
              </span>
              <span>
                이를 통해 단순 취향이 아닌 실제 플레이 스타일 기반의 매칭
                데이터를 제공합니다.
              </span>
            </p>
          </article>

          <article className={styles.card}>
            <h3 className={styles.cardTitle}>
              동물 타입 기반 직관적인 매칭
            </h3>
            <p className={styles.cardDesc}>
              <span>
                분석된 플레이 성향은 동물 타입 프로필과 매칭 퍼센트로
                시각화됩니다.
              </span>
              <span>
                복잡한 데이터 대신 직관적인 캐릭터와 퍼센트로 나와 잘 맞는
                유저를 한눈에 확인할 수 있습니다.
              </span>
            </p>
          </article>
        </div>
      </div>
    </section>
  );
};

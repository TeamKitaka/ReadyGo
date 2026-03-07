'use client';

import styles from './styles.module.css';

export const FooterSection = () => {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.logoArea}>
          <span className={styles.logoText}>ReadyGo</span>
        </div>

        <div className={styles.links}>
          <span>이용약관</span>
          <span>개인정보처리방침</span>
          <span>© {year} ReadyGo. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};

'use client';

import styles from './styles.module.css';

type NavSection = 'about' | 'features' | 'contact';

interface HeaderSectionProps {
  onNavClick: (section: NavSection) => void;
}

export const HeaderSection = ({ onNavClick }: HeaderSectionProps) => {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.logoArea}>
          <div className={styles.logoIconFrame}>
            <div className={styles.logoIconInset}>
              <svg
                className={styles.logoIcon}
                viewBox="0 0 23.8376 19.7757"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M21.0123 15.5387V16.9511H22.4253V18.3634H23.8376V19.7757H15.4629V18.3634H14.0506V16.9511H12.6376V15.5381L21.0123 15.5387ZM18.1877 1.31181H19.5993V9.8882H18.1877V11.3005H16.7747V12.7128H18.187V14.1251H9.81232V12.7135H8.4V19.6H0V0H18.1877V1.31181ZM19.6007 15.5381H11.226V14.1258H19.6007V15.5381ZM5.7764 3.02694V4.74208H4.06123V7.06286H5.7764V8.778H8.09718V7.06286H9.81232V4.74208H8.09718V3.02694H5.7764ZM11.4269 6.45722V8.778H13.7477V6.45722H11.4269ZM21.013 8.47518H19.6007V2.72412H21.013V8.47518ZM14.2523 3.02694V5.34772H16.5731V3.02694H14.2523Z"
                  fill="#7FFDE8"
                />
              </svg>
            </div>
          </div>
          <span className={styles.logoText}>eadyGo</span>
        </div>

        <nav className={styles.nav}>
          <button
            type="button"
            className={`${styles.navItem} ${styles.navItemAbout}`}
            onClick={() => onNavClick('about')}
          >
            About
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${styles.navItemFeatures}`}
            onClick={() => onNavClick('features')}
          >
            Features
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${styles.navItemContact}`}
            onClick={() => onNavClick('contact')}
          >
            Contact
          </button>
        </nav>
      </div>
    </header>
  );
};

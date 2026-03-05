'use client';

import styles from './styles.module.css';

type NavSection = 'about' | 'features' | 'contact';

interface HeaderSectionProps {
  onNavClick: (section: NavSection) => void;
}

export const HeaderSection = ({ onNavClick }: HeaderSectionProps) => {
  const logoIcon =
    'https://www.figma.com/api/mcp/asset/1a4777a2-943b-4864-a23a-d34f52fcda4b';

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.logoArea}>
          <img className={styles.logoIcon} src={logoIcon} alt="ReadyGo" />
        </div>

        <nav className={styles.nav}>
          <button
            type="button"
            className={styles.navItem}
            onClick={() => onNavClick('about')}
          >
            About
          </button>
          <button
            type="button"
            className={styles.navItem}
            onClick={() => onNavClick('features')}
          >
            Features
          </button>
          <button
            type="button"
            className={styles.navItem}
            onClick={() => onNavClick('contact')}
          >
            Contact
          </button>
        </nav>
      </div>
    </header>
  );
};

'use client';

import Icon from '@/commons/components/icon';
import { URL_PATHS } from '@/commons/constants/url';
import styles from '../styles.module.css';
import { NavigationButton } from '../hooks/useLayoutNavigation';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useNotifications } from '@/hooks/useNotifications';

interface SidebarProps {
  activeNav: NavigationButton;
  currentOverlay: string | null;
  onNavClick: (nav: NavigationButton, path: string) => void;
  onNotificationsClick: () => void;
  onFriendsClick: () => void;
}

export const Sidebar = ({
  activeNav,
  onNavClick,
  onNotificationsClick,
  onFriendsClick,
}: SidebarProps) => {
  const { requests } = useFriendRequests();
  const friendRequestCount = requests.length;
  const { unreadCount } = useNotifications();
  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <Icon name="logo" size={40} className={styles.logoIcon} />
      </div>

      <div className={styles.sidebarContent}>
        {/* Navigation Buttons */}
        <nav className={styles.navigation}>
          <button
            className={`${styles.navButton} ${activeNav === 'home' ? styles.active : ''}`}
            onClick={() => onNavClick('home', URL_PATHS.HOME)}
          >
            <div className={styles.navButtonIcon}>
              <Icon name="home-circle" size={20} className={styles.navIcon} />
            </div>
            <span className={styles.navButtonLabel}>홈</span>
          </button>

          <button
            className={`${styles.navButton} ${activeNav === 'chat' ? styles.active : ''}`}
            onClick={() => onNavClick('chat', URL_PATHS.CHAT)}
          >
            <div className={styles.navButtonIcon}>
              <Icon
                name="message-bubble"
                size={20}
                className={styles.navIcon}
              />
            </div>
            <span className={styles.navButtonLabel}>채팅</span>
          </button>

          <button
            className={`${styles.navButton} ${activeNav === 'match' ? styles.active : ''}`}
            onClick={() => onNavClick('match', URL_PATHS.MATCH)}
          >
            <div className={styles.navButtonIcon}>
              <Icon name="match" size={20} className={styles.navIcon} />
            </div>
            <span className={styles.navButtonLabel}>매칭</span>
          </button>

          <button
            className={`${styles.navButton} ${activeNav === 'party' ? styles.active : ''}`}
            onClick={() => onNavClick('party', URL_PATHS.PARTY)}
          >
            <div className={styles.navButtonIcon}>
              <Icon name="handheld" size={20} className={styles.navIcon} />
            </div>
            <span className={styles.navButtonLabel}>파티</span>
          </button>
        </nav>

        {/* Menu Buttons */}
        <div className={styles.menuButtons}>
          <button className={styles.menuButton} onClick={onNotificationsClick}>
            <div className={styles.menuButtonIcon}>
              <Icon
                name="notification"
                size={24}
                className={styles.themeIcon}
              />
              {unreadCount > 0 && <div className={styles.badge} />}
            </div>
          </button>

          <button className={styles.menuButton} onClick={onFriendsClick}>
            <div className={styles.menuButtonIcon}>
              <Icon name="group" size={24} className={styles.themeIcon} />
              {friendRequestCount > 0 && <div className={styles.badge} />}
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
};

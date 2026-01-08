import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import Icon from '@/commons/components/icon';
import Avatar from '@/commons/components/avatar';
import { ProfileDropdown } from '@/components/overlay/profile';
import { useProfileBinding } from '@/components/overlay/profile/hooks/index.binding.hook';
import { getAvatarImagePath } from '@/lib/avatar/getAvatarImagePath';
import styles from '../styles.module.css';

export const Header = () => {
  const [mounted, setMounted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const profileRef = useRef<HTMLDivElement>(null);
  const { profileData, isLoading } = useProfileBinding();

  // 아바타 이미지 경로 계산
  const avatarImagePath = getAvatarImagePath(
    profileData.avatarUrl,
    profileData.animalType
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // 외부 클릭 감지 및 Escape 키 처리
  useEffect(() => {
    if (!isProfileOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    // 약간의 지연을 주어 현재 클릭 이벤트가 전파되지 않도록 함
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isProfileOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <button
          className={styles.themeButton}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="테마 전환"
          suppressHydrationWarning
        >
          {mounted ? (
            <Icon
              name={theme === 'dark' ? 'sun' : 'moon'}
              size={24}
              className={styles.themeIcon}
            />
          ) : (
            <div style={{ width: 24, height: 24 }} />
          )}
        </button>

        <div ref={profileRef} className={styles.profileContainer}>
          <button
            className={styles.userAvatar}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-label="프로필 메뉴"
            aria-expanded={isProfileOpen}
          >
            {isLoading ? (
              <Icon name="user" size={20} />
            ) : (
              <Avatar
                imageUrl={avatarImagePath}
                size="s"
                status="offline"
                showStatus={false}
                className={styles.headerAvatar}
              />
            )}
          </button>

          {isProfileOpen && (
            <ProfileDropdown onClose={() => setIsProfileOpen(false)} />
          )}
        </div>
      </div>
    </header>
  );
};

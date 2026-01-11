'use client';

import styles from './styles.module.css';

interface OverlayContainerProps {
  children: React.ReactNode;
  onClose: () => void;
}

/**
 * Sidebar 오버레이 컨테이너
 * - 친구목록, 알림 등 왼쪽에서 슬라이드되는 오버레이 전용
 * - 백드롭 클릭 시 닫힘
 * - 중앙 모달은 ModalProvider를 사용할 것
 */
export default function OverlayContainer({
  children,
  onClose,
}: OverlayContainerProps) {
  return (
    <div className={styles.overlayBackdrop} onClick={onClose}>
      <div
        className={styles.overlayContent}
        onClick={(event: React.MouseEvent<HTMLDivElement>) =>
          event.stopPropagation()
        }
      >
        {children}
      </div>
    </div>
  );
}

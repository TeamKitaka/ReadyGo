'use client';

import styles from './styles.module.css';

interface ModalContainerProps {
  children: React.ReactNode;
  onClose: () => void;
}

/**
 * 중앙 정렬 모달 컨테이너
 * - 백드롭 + 중앙 배치
 * - 백드롭 클릭 시 닫힘
 * - game-select-modal, review-modal 등 중앙 모달 전용
 * - sidebar 오버레이는 OverlayContainer 사용
 */
export default function ModalContainer({
  children,
  onClose,
}: ModalContainerProps) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.content}
        onClick={(event: React.MouseEvent<HTMLDivElement>) =>
          event.stopPropagation()
        }
      >
        {children}
      </div>
    </div>
  );
}


'use client';

import React, { useEffect, useRef } from 'react';
import Icon from '../icon';
import styles from './styles.module.css';

export interface DropdownItem {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
}

export interface DropdownProps {
  items: DropdownItem[];
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

export default function Dropdown({
  items,
  isOpen,
  onClose,
  anchorRef,
}: DropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <div className={styles.container}>
        {items.map((item) => (
          <button
            key={item.id}
            className={styles.button}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            <Icon name={item.icon} size={16} className={styles.icon} />
            <p className={styles.text}>{item.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}


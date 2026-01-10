'use client';

import React, { useState, useRef, useEffect } from 'react';
import Icon, { type IconName } from '../icon';
import styles from './styles.module.css';

export type SelectboxState =
  | 'default'
  | 'hover'
  | 'filled'
  | 'error'
  | 'disabled'
  | 'active';

export type SelectboxSize = 'm' | 'l';

export interface SelectboxItem {
  id: string;
  value: string;
}

export interface SelectboxProps {
  state?: SelectboxState;
  size?: SelectboxSize;
  label?: string;
  items: SelectboxItem[];
  selectedId?: string;
  onSelect?: (item: SelectboxItem) => void;
  onOpen?: (isOpen: boolean) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  children?: React.ReactNode;
  icon?: string;
  'data-testid'?: string;
}

export default function Selectbox({
  state = 'default',
  size = 'm',
  label,
  items,
  selectedId,
  onSelect,
  onOpen,
  placeholder = 'Placeholder',
  required = false,
  className = '',
  children,
  icon,
  'data-testid': dataTestId,
}: SelectboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalState, setInternalState] = useState<SelectboxState>(state);
  const selectboxRef = useRef<HTMLDivElement>(null);
  const isDisabled = state === 'disabled';

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectboxRef.current &&
        !selectboxRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        if (onOpen) {
          onOpen(false);
        }
        if (state === 'default') {
          setInternalState('default');
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, state, onOpen]);

  // hover 상태 관리
  const handleMouseEnter = () => {
    if (!isDisabled && state === 'default' && !isOpen) {
      setInternalState('hover');
    }
  };

  const handleMouseLeave = () => {
    if (!isDisabled && state === 'default' && !isOpen) {
      setInternalState('default');
    }
  };

  const handleClick = () => {
    if (!isDisabled) {
      const newIsOpen = !isOpen;
      setIsOpen(newIsOpen);
      if (onOpen) {
        onOpen(newIsOpen);
      }
      if (!isOpen && state === 'default') {
        setInternalState('active');
      } else if (isOpen && state === 'default') {
        setInternalState('default');
      }
    }
  };

  const handleItemClick = (item: SelectboxItem) => {
    if (onSelect) {
      onSelect(item);
    }
    setIsOpen(false);
    if (onOpen) {
      onOpen(false);
    }
    if (state === 'default') {
      setInternalState('default');
    }
  };

  const selectedItem = items.find((item) => item.id === selectedId);
  const displayValue = selectedItem ? selectedItem.value : placeholder;
  const isFilled = selectedItem !== undefined;

  // 실제 사용할 state 결정
  const actualState =
    state !== 'default' ? state : isOpen ? 'active' : internalState;

  const selectboxClasses = [
    styles.selectbox,
    styles[`size-${size}`],
    styles[`state-${actualState}`],
    isDisabled && styles.disabled,
    isFilled && styles.filled,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const optionGroupClasses = [styles.optionGroup, isOpen && styles.open]
    .filter(Boolean)
    .join(' ');

  const wrapperClasses = [styles.wrapper, className].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses} ref={selectboxRef}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div
        className={selectboxClasses}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={isDisabled}
        data-testid={dataTestId}
      >
        <div className={styles.content}>
          {children || (
            <span
              className={`${styles.value} ${
                !selectedItem ? styles.placeholder : ''
              }`}
            >
              {displayValue}
            </span>
          )}
        </div>
        <div className={styles.chevron}>
          {icon ? (
            <Icon name={icon as IconName} size={16} />
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
      {isOpen && (
        <div className={optionGroupClasses} role="listbox">
          {items.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <div
                key={item.id}
                className={`${styles.optionItem} ${
                  isSelected ? styles.selected : ''
                }`}
                onClick={() => handleItemClick(item)}
                role="option"
                aria-selected={isSelected}
                data-testid={
                  dataTestId ? `${dataTestId}-option-${item.id}` : undefined
                }
              >
                {isSelected && (
                  <span className={styles.checkIcon}>
                    <Icon name="check" size={20} />
                  </span>
                )}
                <span className={styles.optionValue}>{item.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

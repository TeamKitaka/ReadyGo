'use client';

import { useState } from 'react';
import styles from './styles.module.css';
import Button from '@/commons/components/button';
import Input from '@/commons/components/input';
import Avatar from '@/commons/components/avatar';
import Icon from '@/commons/components/icon';

interface ReviewOption {
  id: string;
  text: string;
  checked: boolean;
}

export default function ReviewSubmit() {
  const [reviewOptions, setReviewOptions] = useState<ReviewOption[]>([
    {
      id: '1',
      text: '매칭 과정에서 예의 바르고 편안한 태도로 대화했어요.',
      checked: false,
    },
    {
      id: '2',
      text: '불쾌한 말투 · 언행 없이 매너 있게 응대했어요.',
      checked: true,
    },
    {
      id: '3',
      text: '약속한 시간·게임 목표 등에 대해 성실하게 협력 의사를 보여줬어요.',
      checked: false,
    },
    {
      id: '4',
      text: '게임 시작 전 필요한 정보나 약속을 명확하게 주고 받았어요.',
      checked: false,
    },
    {
      id: '5',
      text: '시간 변경 · 상황 안내 등 소통이 빠르고 원활했어요.',
      checked: false,
    },
  ]);

  const [reviewText, setReviewText] = useState('');

  const handleOptionClick = (id: string) => {
    setReviewOptions((prev) =>
      prev.map((option) =>
        option.id === id ? { ...option, checked: !option.checked } : option
      )
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerArea}>
        <div className={styles.headerContent}>
          <div className={styles.indicator}>
            <div className={styles.indicatorDot} />
            <div className={styles.indicatorDot} />
            <div className={styles.indicatorDot} />
          </div>
          <div className={styles.headerText}>review</div>
        </div>
      </div>
      <div className={styles.mainArea}>
        <div className={styles.contentWrapper}>
          <div className={styles.titleSection}>
            <Avatar size="L" showStatus={false} />
            <div className={styles.titleTextSection}>
              <h2 className={styles.title}>
                까칠한까마귀님과 게임은 어떠셨나요?
              </h2>
              <p className={styles.description}>
                함께한 시간이 소중한 피드백이 됩니다
              </p>
            </div>
          </div>

          <div className={styles.optionsSection}>
            {reviewOptions.map((option) => (
              <div
                key={option.id}
                className={`${styles.optionItem} ${
                  option.checked ? styles.optionItemSelected : ''
                }`}
                onClick={() => handleOptionClick(option.id)}
              >
                <div className={styles.checkboxContainer}>
                  <div
                    className={`${styles.checkbox} ${
                      option.checked ? styles.checkboxChecked : ''
                    }`}
                  >
                    {option.checked && (
                      <Icon
                        name="check"
                        size={16}
                        style={{ color: 'var(--color-bg-primary)' }}
                      />
                    )}
                  </div>
                </div>
                <span
                  className={`${styles.optionText} ${
                    option.checked ? styles.optionTextSelected : ''
                  }`}
                >
                  {option.text}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.inputSection}>
            <Input
              label="한줄후기평"
              placeholder="게임 중 기억에 남았던 순간이나 하고 싶은 말을 전해보세요. (선택)"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              variant="secondary"
              size="l"
              labelClassName={styles.inputLabel}
            />
          </div>
        </div>
      </div>
      <div className={styles.buttonArea}>
        <div className={styles.buttonWrapper}>
          <Button
            variant="secondary"
            size="m"
            shape="rectangle"
            className={styles.cancelButton}
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="m"
            shape="rectangle"
            className={styles.submitButton}
          >
            후기 남기기
          </Button>
        </div>
      </div>
    </div>
  );
}

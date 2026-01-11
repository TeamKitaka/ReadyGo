'use client';

import { useState } from 'react';
import ModalContainer from '@/commons/components/modal-container';
import Button from '@/commons/components/button';
import Input from '@/commons/components/input';
import Avatar from '@/commons/components/avatar';
import Icon from '@/commons/components/icon';
import styles from './styles.module.css';
import type { ReviewAnswers } from '@/services/temperature/calculateTemperatureFromReview.service';

export interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (answers: ReviewAnswers) => Promise<void>;
  targetUserNickname: string;
  targetUserAvatar?: string;
  targetUserAnimalType?: string;
}

/**
 * 후기 모달 컴포넌트
 *
 * 책임:
 * - 5개 문항 체크박스 UI
 * - 코멘트 입력 필드
 * - 제출 버튼
 * - 화면 비율에 맞는 반응형 디자인
 *
 * 문항 구성:
 * 1. 매너: "매칭 과정에서 예의 바르고 편안한 태도로 대화했나요?"
 * 2. 매너: "불쾌한 말투·언행 없이 매너 있게 응대했나요?"
 * 3. 팀워크: "약속한 시간·게임 목표 등에 대해 성실하게 협력 의사를 보여줬나요?"
 * 4. 소통: "게임 시작 전 필요한 정보나 약속을 명확하게 주고받았나요?"
 * 5. 소통: "시간 변경·상황 안내 등 소통이 빠르고 원활했나요?"
 */
export default function ReviewModal({
  isOpen,
  onClose,
  onSubmit,
  targetUserNickname,
  targetUserAvatar,
  targetUserAnimalType,
}: ReviewModalProps) {
  const [answers, setAnswers] = useState<ReviewAnswers>({
    manner: [false, false],
    teamwork: [false],
    communication: [false, false],
    comment: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reviewQuestions = [
    {
      id: 'manner-1',
      category: 'manner' as const,
      index: 0,
      text: '매칭 과정에서 예의 바르고 편안한 태도로 대화했나요?',
    },
    {
      id: 'manner-2',
      category: 'manner' as const,
      index: 1,
      text: '불쾌한 말투·언행 없이 매너 있게 응대했나요?',
    },
    {
      id: 'teamwork-1',
      category: 'teamwork' as const,
      index: 0,
      text: '약속한 시간·게임 목표 등에 대해 성실하게 협력 의사를 보여줬나요?',
    },
    {
      id: 'communication-1',
      category: 'communication' as const,
      index: 0,
      text: '게임 시작 전 필요한 정보나 약속을 명확하게 주고받았나요?',
    },
    {
      id: 'communication-2',
      category: 'communication' as const,
      index: 1,
      text: '시간 변경·상황 안내 등 소통이 빠르고 원활했나요?',
    },
  ];

  const handleOptionClick = (
    category: 'manner' | 'teamwork' | 'communication',
    index: number
  ) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev };
      if (category === 'manner') {
        const newManner = [...prev.manner] as [boolean, boolean];
        newManner[index] = !newManner[index];
        newAnswers.manner = newManner;
      } else if (category === 'teamwork') {
        const newTeamwork = [...prev.teamwork] as [boolean];
        newTeamwork[index] = !newTeamwork[index];
        newAnswers.teamwork = newTeamwork;
      } else if (category === 'communication') {
        const newCommunication = [...prev.communication] as [boolean, boolean];
        newCommunication[index] = !newCommunication[index];
        newAnswers.communication = newCommunication;
      }
      return newAnswers;
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(answers);
      onClose();
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isChecked = (
    category: 'manner' | 'teamwork' | 'communication',
    index: number
  ) => {
    if (category === 'manner') {
      return answers.manner[index];
    } else if (category === 'teamwork') {
      return answers.teamwork[index];
    } else {
      return answers.communication[index];
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalContainer onClose={onClose}>
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
              <Avatar
                imageUrl={targetUserAvatar}
                animalType={targetUserAnimalType}
                size="L"
                showStatus={false}
              />
              <div className={styles.titleTextSection}>
                <h2 className={styles.title}>
                  {targetUserNickname}님과 게임은 어떠셨나요?
                </h2>
                <p className={styles.description}>
                  함께한 시간이 소중한 피드백이 됩니다
                </p>
              </div>
            </div>

            <div className={styles.optionsSection}>
              {reviewQuestions.map((question) => {
                const checked = isChecked(question.category, question.index);
                return (
                  <div
                    key={question.id}
                    className={`${styles.optionItem} ${
                      checked ? styles.optionItemSelected : ''
                    }`}
                    onClick={() =>
                      handleOptionClick(question.category, question.index)
                    }
                  >
                    <div className={styles.checkboxContainer}>
                      <div
                        className={`${styles.checkbox} ${
                          checked ? styles.checkboxChecked : ''
                        }`}
                      >
                        {checked && (
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
                        checked ? styles.optionTextSelected : ''
                      }`}
                    >
                      {question.text}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={styles.inputSection}>
              <Input
                label="한줄후기평"
                placeholder="게임 중 기억에 남았던 순간이나 하고 싶은 말을 전해보세요. (선택)"
                value={answers.comment || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, comment: e.target.value }))
                }
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
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="m"
              shape="rectangle"
              className={styles.submitButton}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? '제출 중...' : '후기 남기기'}
            </Button>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
}

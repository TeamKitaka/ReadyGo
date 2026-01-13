'use client';

import styles from './styles.module.css';
import Button from '@/commons/components/button';
import Avatar from '@/commons/components/avatar';
import type { ReviewData, ReviewerProfile } from '@/hooks/useReviewReceivedModalFromNotification.hook';
import type { AnimalType } from '@/commons/constants/animal';
import { getAvatarImagePath } from '@/lib/avatar/getAvatarImagePath';

interface ReviewReceivedProps {
  onClose?: () => void;
  reviewData: ReviewData | null;
  reviewerProfile: ReviewerProfile | null;
}

export default function ReviewReceived({ onClose, reviewData, reviewerProfile }: ReviewReceivedProps) {
  // 체크 항목 텍스트 정의 (ReviewModal의 질문 순서와 동일)
  const reviewQuestionTexts = [
    '매칭 과정에서 예의 바르고 편안한 태도로 대화했어요.', // manner[0]
    '불쾌한 말투 · 언행 없이 매너 있게 응대했어요.', // manner[1]
    '약속한 시간·게임 목표 등에 대해 성실하게 협력 의사를 보여줬어요.', // teamwork[0]
    '게임 시작 전 필요한 정보나 약속을 명확하게 주고 받았어요.', // communication[0]
    '시간 변경·상황 안내 등 소통이 빠르고 원활했어요.', // communication[1]
  ];

  // score 값으로부터 체크된 항목들 추론
  const getCheckedPoints = (): string[] => {
    if (!reviewData) return [];

    const checkedPoints: string[] = [];

    // manner 점수에 따른 항목 추가
    if (reviewData.score_manner >= 1) {
      checkedPoints.push(reviewQuestionTexts[0]); // 첫 번째 매너 항목
    }
    if (reviewData.score_manner >= 2) {
      checkedPoints.push(reviewQuestionTexts[1]); // 두 번째 매너 항목
    }

    // teamwork 점수에 따른 항목 추가
    if (reviewData.score_teamwork >= 1) {
      checkedPoints.push(reviewQuestionTexts[2]); // 팀워크 항목
    }

    // communication 점수에 따른 항목 추가
    if (reviewData.score_communication >= 1) {
      checkedPoints.push(reviewQuestionTexts[3]); // 첫 번째 소통 항목
    }
    if (reviewData.score_communication >= 2) {
      checkedPoints.push(reviewQuestionTexts[4]); // 두 번째 소통 항목
    }

    return checkedPoints;
  };

  const checkedPoints = getCheckedPoints();

  // 날짜 포맷팅 (YYYY.MM.DD 형식)
  const formatGameDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const gameDate = reviewData ? formatGameDate(reviewData.created_at) : '';
  const nickname = reviewerProfile?.nickname || '알 수 없음';
  const avatarImagePath = getAvatarImagePath(
    reviewerProfile?.avatar_url,
    reviewerProfile?.animal_type
  );
  const animalType = reviewerProfile?.animal_type as AnimalType | undefined;
  const comment = reviewData?.comment || '';

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
            <Avatar
              size="L"
              showStatus={false}
              imageUrl={avatarImagePath}
              animalType={animalType}
            />
            <div className={styles.titleTextSection}>
              <h2 className={styles.title}>
                {nickname}님이 보낸 후기가 도착했어요.
              </h2>
              <p className={styles.description}>
                {nickname}님과 {gameDate}에 함께 게임했어요.
              </p>
            </div>
          </div>

          <div className={styles.reviewSection}>
            <div className={styles.reviewBox}>
              {comment && (
                <div className={styles.quoteBox}>
                  <p className={styles.quoteText}>
                    &ldquo;{comment}&rdquo;
                  </p>
                </div>
              )}
              {checkedPoints.length > 0 && (
                <div className={styles.pointsList}>
                  {checkedPoints.map((point, index) => (
                    <div key={index} className={styles.pointItem}>
                      <div className={styles.pointDot} />
                      <span className={styles.pointText}>{point}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.buttonArea}>
        <Button
          variant="primary"
          size="m"
          shape="rectangle"
          className={styles.confirmButton}
          onClick={onClose}
        >
          확인
        </Button>
      </div>
    </div>
  );
}

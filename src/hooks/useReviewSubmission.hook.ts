'use client';

import { useState, useCallback } from 'react';
import type { ReviewAnswers } from '@/services/temperature/calculateTemperatureFromReview.service';

export interface UseReviewSubmissionReturn {
  isSubmitting: boolean;
  error: string | null;
  submitReview: (
    reviewerId: string,
    targetUserId: string,
    answers: ReviewAnswers,
    reviewRequestId?: number
  ) => Promise<void>;
}

/**
 * 후기 제출 공동 훅
 *
 * 책임:
 * - 후기 제출 로직 관리
 * - API Route를 통해 서버에서 후기 제출 처리
 *
 * 사용처:
 * - 1:1 채팅방 후기 작성
 * - 파티 매칭 후기 작성
 */
export const useReviewSubmission = (): UseReviewSubmissionReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitReview = useCallback(
    async (
      reviewerId: string,
      targetUserId: string,
      answers: ReviewAnswers,
      reviewRequestId?: number
    ) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch('/api/reviews/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            targetUserId,
            answers,
            ...(reviewRequestId !== undefined && { reviewRequestId }),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.detail ||
            errorData.message ||
            '후기 제출에 실패했습니다.';
          throw new Error(errorMessage);
        }

        await response.json();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '후기 제출에 실패했습니다.';
        setError(errorMessage);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return {
    isSubmitting,
    error,
    submitReview: handleSubmitReview,
  };
};

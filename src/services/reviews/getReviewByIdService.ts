import * as reviewsRepository from '@/repositories/reviews.repository';
import {
  ReviewFetchError,
  ReviewNotFoundError,
  ReviewValidationError,
} from '@/commons/errors/reviews/reviewsErrors';

/**
 * 특정 리뷰 ID로 리뷰 조회 Service
 *
 * 책임:
 * - 입력 검증 (reviewId)
 * - Repository 에러 처리
 * - 리뷰가 없을 경우 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const getReviewByIdService = async (reviewId: number) => {
  // 입력 검증
  if (typeof reviewId !== 'number' || isNaN(reviewId) || reviewId <= 0) {
    throw new ReviewValidationError('reviewId는 양수여야 합니다.');
  }

  try {
    const review = await reviewsRepository.getReviewById(reviewId);

    if (!review) {
      throw new ReviewNotFoundError(reviewId);
    }

    return review;
  } catch (error) {
    if (
      error instanceof ReviewValidationError ||
      error instanceof ReviewNotFoundError
    ) {
      throw error;
    }

    throw new ReviewFetchError(
      'review',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

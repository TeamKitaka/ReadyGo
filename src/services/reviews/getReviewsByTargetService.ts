import * as reviewsRepository from '@/repositories/reviews.repository';
import {
  ReviewFetchError,
  ReviewValidationError,
} from '@/commons/errors/reviews/reviewsErrors';

/**
 * 특정 사용자가 받은 리뷰 목록 조회 Service
 *
 * 책임:
 * - 입력 검증 (targetUserId, limit, offset)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const getReviewsByTargetService = async (
  targetUserId: string,
  limit: number = 50,
  offset: number = 0
) => {
  // 입력 검증
  if (
    !targetUserId ||
    typeof targetUserId !== 'string' ||
    !targetUserId.trim()
  ) {
    throw new ReviewValidationError(
      'targetUserId는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
    throw new ReviewValidationError('limit은 1 이상의 숫자여야 합니다.');
  }

  if (typeof offset !== 'number' || isNaN(offset) || offset < 0) {
    throw new ReviewValidationError('offset은 0 이상의 숫자여야 합니다.');
  }

  try {
    const reviews = await reviewsRepository.getReviewsByTarget(
      targetUserId.trim(),
      limit,
      offset
    );
    return reviews;
  } catch (error) {
    if (error instanceof ReviewValidationError) {
      throw error;
    }

    throw new ReviewFetchError(
      'reviews',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

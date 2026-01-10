import * as reviewsRepository from '@/repositories/reviews.repository';
import {
  ReviewFetchError,
  ReviewValidationError,
} from '@/commons/errors/reviews/reviewsErrors';

/**
 * 두 사용자 간의 상호 리뷰 조회 Service
 *
 * 책임:
 * - 입력 검증 (userId1, userId2)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const getReviewsBetweenUsersService = async (
  userId1: string,
  userId2: string
) => {
  // 입력 검증
  if (!userId1 || typeof userId1 !== 'string' || !userId1.trim()) {
    throw new ReviewValidationError(
      'userId1는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (!userId2 || typeof userId2 !== 'string' || !userId2.trim()) {
    throw new ReviewValidationError(
      'userId2는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (userId1.trim() === userId2.trim()) {
    throw new ReviewValidationError(
      'userId1과 userId2는 서로 다른 값이어야 합니다.'
    );
  }

  try {
    const reviews = await reviewsRepository.getReviewsBetweenUsers(
      userId1.trim(),
      userId2.trim()
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

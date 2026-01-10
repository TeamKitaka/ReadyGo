import * as reviewsRepository from '@/repositories/reviews.repository';
import {
  ReviewCreateError,
  ReviewValidationError,
} from '@/commons/errors/reviews/reviewsErrors';
import type { CreateReviewParams } from '@/repositories/reviews.repository';

/**
 * 리뷰 작성 Service
 *
 * 책임:
 * - 입력 검증 (모든 필수 필드)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const createReviewService = async (
  params: CreateReviewParams
) => {
  // 입력 검증
  if (
    !params.reviewer_id ||
    typeof params.reviewer_id !== 'string' ||
    !params.reviewer_id.trim()
  ) {
    throw new ReviewValidationError(
      'reviewer_id는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (
    !params.target_user_id ||
    typeof params.target_user_id !== 'string' ||
    !params.target_user_id.trim()
  ) {
    throw new ReviewValidationError(
      'target_user_id는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (params.reviewer_id.trim() === params.target_user_id.trim()) {
    throw new ReviewValidationError(
      'reviewer_id와 target_user_id는 서로 다른 값이어야 합니다.'
    );
  }

  if (
    typeof params.score_manner !== 'number' ||
    isNaN(params.score_manner) ||
    params.score_manner < 0 ||
    params.score_manner > 2 ||
    !Number.isInteger(params.score_manner)
  ) {
    throw new ReviewValidationError(
      'score_manner는 0 이상 2 이하의 정수여야 합니다.'
    );
  }

  if (
    typeof params.score_teamwork !== 'number' ||
    isNaN(params.score_teamwork) ||
    params.score_teamwork < 0 ||
    params.score_teamwork > 1 ||
    !Number.isInteger(params.score_teamwork)
  ) {
    throw new ReviewValidationError(
      'score_teamwork는 0 이상 1 이하의 정수여야 합니다.'
    );
  }

  if (
    typeof params.score_communication !== 'number' ||
    isNaN(params.score_communication) ||
    params.score_communication < 0 ||
    params.score_communication > 2 ||
    !Number.isInteger(params.score_communication)
  ) {
    throw new ReviewValidationError(
      'score_communication은 0 이상 2 이하의 정수여야 합니다.'
    );
  }

  // comment는 선택적이지만, 제공된 경우 검증
  if (params.comment !== undefined && params.comment !== null) {
    if (typeof params.comment !== 'string') {
      throw new ReviewValidationError('comment는 문자열이어야 합니다.');
    }
  }

  // 문자열 필드 trim 처리
  const validatedParams: CreateReviewParams = {
    reviewer_id: params.reviewer_id.trim(),
    target_user_id: params.target_user_id.trim(),
    score_manner: params.score_manner,
    score_teamwork: params.score_teamwork,
    score_communication: params.score_communication,
    comment: params.comment ? params.comment.trim() : null,
  };

  try {
    const review = await reviewsRepository.createReview(validatedParams);

    if (!review) {
      throw new ReviewCreateError('리뷰 생성에 실패했습니다.');
    }

    return review;
  } catch (error) {
    if (
      error instanceof ReviewCreateError ||
      error instanceof ReviewValidationError
    ) {
      throw error;
    }

    throw new ReviewCreateError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

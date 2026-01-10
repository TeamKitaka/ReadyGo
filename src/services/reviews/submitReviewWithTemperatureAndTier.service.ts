import * as reviewsRepository from '@/repositories/reviews.repository';
import { createReviewService } from '@/services/reviews/createReviewService';
import { updateTemperatureFromReview } from '@/services/temperature/updateTemperatureFromReview.service';
import { updateTierFromTemperature } from '@/services/tier/updateTierFromTemperature.service';

/**
 * 리뷰 제출 및 온도/티어 업데이트 통합 서비스
 *
 * 책임:
 * - 리뷰 생성
 * - 온도 점수 계산 및 업데이트
 * - 티어 계산 및 업데이트
 * - 온도 로그 기록
 * - 티어 히스토리 기록
 */

export interface SubmitReviewParams {
  targetUserId: string;
  scoreManner: number; // 0-2
  scoreTeamwork: number; // 0-1
  scoreCommunication: number; // 0-2
  comment?: string | null;
}

export interface SubmitReviewResult {
  review: reviewsRepository.Review;
  newTemperature: number;
  newTier: string;
  tierChanged: boolean;
}

/**
 * 리뷰 제출 및 온도/티어 업데이트
 *
 * @param params - 리뷰 제출 파라미터
 * @param reviewerId - 리뷰 작성자 ID
 * @returns 리뷰, 온도, 티어 정보
 */
export const submitReviewWithTemperatureAndTier = async (
  params: SubmitReviewParams,
  reviewerId: string
): Promise<SubmitReviewResult> => {
  const { targetUserId, scoreManner, scoreTeamwork, scoreCommunication, comment } = params;

  // 1. 리뷰 생성
  const review = await createReviewService({
    reviewer_id: reviewerId,
    target_user_id: targetUserId,
    score_manner: scoreManner,
    score_teamwork: scoreTeamwork,
    score_communication: scoreCommunication,
    comment: comment || null,
  });

  // 2. 온도 계산 및 업데이트
  let newTemperature: number;
  try {
    newTemperature = await updateTemperatureFromReview({
      targetUserId,
      reviewScores: {
        scoreManner,
        scoreTeamwork,
        scoreCommunication,
      },
    });
  } catch (error) {
    console.error('Failed to update temperature from review:', error);
    throw new Error(
      `온도 업데이트 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // 3. 티어 계산 및 업데이트
  let newTier: string;
  let tierChanged: boolean;
  try {
    const tierResult = await updateTierFromTemperature({
      userId: targetUserId,
      newTemperature,
    });
    newTier = tierResult.newTier;
    tierChanged = tierResult.tierChanged;
  } catch (error) {
    console.error('Failed to update tier from temperature:', error);
    throw new Error(
      `티어 업데이트 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return {
    review,
    newTemperature,
    newTier,
    tierChanged,
  };
};

import { supabaseAdmin } from '@/lib/supabase/admin';
import * as reviewsRepository from '@/repositories/reviews.repository';
import * as temperatureLogRepository from '@/repositories/temperatureLog.repository';
import * as userProfilesRepository from '@/repositories/userProfiles.repository';
import { calculateTemperatureFromReview } from '../temperature/calculateTemperatureFromReview.service';
import { updateTierFromTemperature } from '../tier/updateTierFromTemperature.service';
import type { ReviewAnswers } from '../temperature/calculateTemperatureFromReview.service';

/**
 * 리뷰 제출 서비스
 *
 * 책임:
 * - 리뷰 저장 (reviews 테이블)
 * - 온도 점수 계산 및 temperature_logs 기록
 * - user_profiles의 temperature_score 업데이트 (기존 점수 + change)
 * - 티어 계산 및 user_profiles의 tier 업데이트
 * - tier_history 기록 (티어 변경 시에만)
 *
 * 처리 순서:
 * 1. reviews 테이블에 리뷰 저장
 * 2. 온도 점수 계산 (Yes 개수 × 0.15) → change 값
 * 3. temperature_logs에 change 값 기록
 * 4. user_profiles.temperature_score 업데이트 (기존 점수 + change)
 * 5. 업데이트된 temperature_score로 티어 계산
 * 6. 티어 변경 시에만:
 *    - user_profiles.tier 업데이트
 *    - tier_history 기록 (previous_tier: 업데이트 전 값, current_tier: 새 티어)
 */

/**
 * 리뷰 제출
 *
 * @param reviewerId - 리뷰 작성자 ID
 * @param targetUserId - 리뷰 대상 사용자 ID
 * @param answers - 후기 답변
 * @returns 생성된 리뷰 정보
 */
export const submitReview = async (
  reviewerId: string,
  targetUserId: string,
  answers: ReviewAnswers
) => {
  // 1. 온도 점수 계산 (Yes 개수 × 0.15) → change 값
  const temperatureChange = calculateTemperatureFromReview(answers);

  // 2. 리뷰 점수 계산 (매너, 팀워크, 소통)
  const scoreManner = (answers.manner[0] ? 1 : 0) + (answers.manner[1] ? 1 : 0);
  const scoreTeamwork = answers.teamwork[0] ? 1 : 0;
  const scoreCommunication =
    (answers.communication[0] ? 1 : 0) + (answers.communication[1] ? 1 : 0);

  // 3. reviews 테이블에 리뷰 저장
  const review = await reviewsRepository.createReview({
    reviewer_id: reviewerId,
    target_user_id: targetUserId,
    score_manner: scoreManner,
    score_teamwork: scoreTeamwork,
    score_communication: scoreCommunication,
    comment: answers.comment || null,
  });

  // 4. temperature_logs에 change 값 기록
  await temperatureLogRepository.createTemperatureLog({
    user_id: targetUserId,
    change: temperatureChange,
    reason: `리뷰: 매너 ${scoreManner}/2, 팀워크 ${scoreTeamwork}/1, 소통 ${scoreCommunication}/2`,
  });

  // 5. user_profiles.temperature_score 업데이트 (기존 점수 + change)
  await userProfilesRepository.updateTemperatureScore(
    supabaseAdmin,
    targetUserId,
    temperatureChange
  );

  // 6. 업데이트된 temperature_score 조회
  const updatedTemperatureScore =
    await userProfilesRepository.getTemperatureScore(
      supabaseAdmin,
      targetUserId
    );

  if (updatedTemperatureScore === null) {
    throw new Error(
      `Failed to get updated temperature score for userId: ${targetUserId}`
    );
  }

  // 7. 티어 계산 및 업데이트
  await updateTierFromTemperature(targetUserId, updatedTemperatureScore);

  return review;
};

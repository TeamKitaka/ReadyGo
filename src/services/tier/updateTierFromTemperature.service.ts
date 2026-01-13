import { supabaseAdmin } from '@/lib/supabase/admin';
import { TierType } from '@/commons/constants/tierType.enum';
import { calculateTierFromTemperature } from './calculateTierFromTemperature.service';
import * as userProfilesRepository from '@/repositories/userProfiles.repository';
import * as tierHistoryRepository from '@/repositories/tierHistory.repository';

/**
 * 온도 점수 업데이트 후 티어 재계산 및 업데이트
 *
 * 책임:
 * - 온도 점수 업데이트 후 티어 재계산
 * - 티어 변경 시에만 tier_history 기록
 * - previous_tier: 업데이트 전 user_profiles.tier 값
 * - current_tier: 티어가 변경되었을 때만 새 티어 값 저장
 */

/**
 * 온도 점수 업데이트 후 티어 재계산 및 업데이트
 *
 * @param userId - 사용자 ID
 * @param newTemperatureScore - 업데이트된 온도 점수
 * @returns 티어가 변경되었는지 여부와 새 티어
 *
 * @example
 * ```typescript
 * const result = await updateTierFromTemperature('user-id', 45);
 * // { tierChanged: true, newTier: TierType.gold, previousTier: TierType.silver }
 * ```
 */
export const updateTierFromTemperature = async (
  userId: string,
  newTemperatureScore: number
): Promise<{
  tierChanged: boolean;
  newTier: TierType;
  previousTier: TierType | null;
}> => {
  // 현재 티어 조회
  const currentTier = await userProfilesRepository.getTier(
    supabaseAdmin,
    userId
  );

  if (!currentTier) {
    throw new Error(`User profile not found for userId: ${userId}`);
  }

  // 새 티어 계산
  const newTier = calculateTierFromTemperature(newTemperatureScore);

  // 티어가 변경되지 않았으면 종료
  if (currentTier === newTier) {
    return {
      tierChanged: false,
      newTier,
      previousTier: currentTier,
    };
  }

  // 티어 업데이트
  await userProfilesRepository.updateTier(supabaseAdmin, userId, newTier);

  // 티어 히스토리 기록
  // previous_tier: 업데이트 전 user_profiles.tier 값
  // current_tier: 변경된 새 티어 값
  await tierHistoryRepository.createTierHistory({
    user_id: userId,
    previous_tier: currentTier,
    current_tier: newTier,
  });

  return {
    tierChanged: true,
    newTier,
    previousTier: currentTier,
  };
};

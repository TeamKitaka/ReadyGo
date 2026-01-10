import * as tierHistoryRepository from '@/repositories/tierHistory.repository';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateTierFromTemperature } from './calculateTierFromTemperature.service';
import { TierType } from '@/commons/constants/tierType.enum';

/**
 * 온도 업데이트 후 티어 재계산 및 업데이트 서비스
 *
 * 책임:
 * - 온도 점수 기반 티어 재계산
 * - 티어 변경 시 tier_history 테이블에 기록
 * - user_profiles.tier 업데이트
 */

export interface UpdateTierParams {
  userId: string;
  newTemperature: number;
}

/**
 * 온도 기반 티어 업데이트
 *
 * @param params - 티어 업데이트 파라미터
 * @returns 업데이트된 티어 타입 및 변경 여부
 */
export const updateTierFromTemperature = async (
  params: UpdateTierParams
): Promise<{ newTier: TierType; tierChanged: boolean }> => {
  const { userId, newTemperature } = params;

  // 1. 현재 티어 및 온도 조회
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('tier, temperature_score')
    .eq('id', userId)
    .single();

  if (profileError) {
    throw new Error(`Failed to fetch user profile: ${profileError.message}`);
  }

  if (!profile) {
    throw new Error('User profile not found');
  }

  // 2. 이전 티어는 user_profiles.tier에서 가져오기
  const previousTier = (profile.tier as TierType) || TierType.bronze;

  // 3. 새로운 온도로 티어 계산
  const newTier = calculateTierFromTemperature(newTemperature);

  // 4. 티어 변경 여부 확인
  const tierChanged = previousTier !== newTier;

  // 5. 항상 tier_history 테이블에 기록 (변경 여부와 관계없이)
  await tierHistoryRepository.createTierHistory({
    user_id: userId,
    previous_tier: previousTier,
    current_tier: newTier,
  });

  // 6. 티어가 변경되었으면 user_profiles.tier 업데이트
  if (tierChanged) {
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ tier: newTier })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update tier: ${updateError.message}`);
    }
  }

  return { newTier, tierChanged };
};

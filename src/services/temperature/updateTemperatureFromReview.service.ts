import * as temperatureLogRepository from '@/repositories/temperatureLog.repository';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  calculateTemperatureChange,
  applyTemperatureChange,
  type ReviewScores,
} from './calculateTemperatureFromReview.service';

/**
 * 리뷰 생성 후 온도 업데이트 통합 서비스
 *
 * 책임:
 * - 리뷰 점수 기반 온도 계산
 * - user_profiles.temperature_score 업데이트
 * - temperature_logs 테이블에 로그 기록
 */

export interface UpdateTemperatureParams {
  targetUserId: string;
  reviewScores: ReviewScores;
}

/**
 * 리뷰 기반 온도 업데이트
 *
 * @param params - 온도 업데이트 파라미터
 * @returns 업데이트된 온도 점수
 */
export const updateTemperatureFromReview = async (
  params: UpdateTemperatureParams
): Promise<number> => {
  const { targetUserId, reviewScores } = params;

  // 1. 현재 온도 점수 조회
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('temperature_score')
    .eq('id', targetUserId)
    .single();

  if (profileError) {
    throw new Error(
      `Failed to fetch user profile: ${profileError.message}`
    );
  }

  if (!profile) {
    throw new Error('User profile not found');
  }

  const currentTemperature = profile.temperature_score || 0;

  // 2. 온도 변화량 계산
  const temperatureChange = calculateTemperatureChange(reviewScores);

  // 3. 새로운 온도 계산
  const newTemperature = applyTemperatureChange(
    currentTemperature,
    temperatureChange
  );

  // 4. 온도를 정수로 반올림 (데이터베이스가 integer 타입이므로)
  const roundedTemperature = Math.round(newTemperature);

  // 5. user_profiles.temperature_score 업데이트
  const { error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update({ temperature_score: roundedTemperature })
    .eq('id', targetUserId);

  if (updateError) {
    throw new Error(
      `Failed to update temperature score: ${updateError.message}`
    );
  }

  // 6. temperature_logs에 로그 기록
  // change는 int 타입이므로 밀리 단위(100배)로 저장 (0.15 → 15, 0.75 → 75)
  await temperatureLogRepository.createTemperatureLog({
    user_id: targetUserId,
    change: Math.round(temperatureChange * 100), // 밀리 단위로 저장
    reason: `리뷰: 매너 ${reviewScores.scoreManner}/2, 팀워크 ${reviewScores.scoreTeamwork}/1, 소통 ${reviewScores.scoreCommunication}/2`,
  });

  return roundedTemperature;
};

/**
 * 리뷰 점수 기반 온도 계산 서비스
 *
 * 책임:
 * - 리뷰 점수(매너, 팀워크, 소통)를 기반으로 온도 변화량 계산
 * - 체크당 0.15점 증가
 * - 최대 +0.75점 (5문항 모두 체크 시)
 */

export interface ReviewScores {
  scoreManner: number; // 0-2 (매너 문항 2개)
  scoreTeamwork: number; // 0-1 (팀워크 문항 1개)
  scoreCommunication: number; // 0-2 (소통 문항 2개)
}

/**
 * 리뷰 점수를 기반으로 온도 변화량 계산
 *
 * @param scores - 리뷰 점수 (체크된 문항 개수)
 * @returns 온도 변화량 (0 ~ 0.75)
 *
 * @example
 * ```typescript
 * const scores = {
 *   scoreManner: 2, // 매너 2개 모두 체크
 *   scoreTeamwork: 1, // 팀워크 1개 체크
 *   scoreCommunication: 2, // 소통 2개 모두 체크
 * };
 * const change = calculateTemperatureChange(scores); // 0.75
 * ```
 */
export const calculateTemperatureChange = (
  scores: ReviewScores
): number => {
  // 체크당 0.15점
  const POINTS_PER_CHECK = 0.15;

  // 각 카테고리별 점수 계산
  const mannerPoints = scores.scoreManner * POINTS_PER_CHECK; // 최대 0.30
  const teamworkPoints = scores.scoreTeamwork * POINTS_PER_CHECK; // 최대 0.15
  const communicationPoints = scores.scoreCommunication * POINTS_PER_CHECK; // 최대 0.30

  // 총 온도 변화량 (최대 0.75)
  const totalChange = mannerPoints + teamworkPoints + communicationPoints;

  return Math.round(totalChange * 100) / 100; // 소수점 둘째 자리까지 반올림
};

/**
 * 현재 온도에 변화량을 적용하여 새로운 온도 계산
 *
 * @param currentTemperature - 현재 온도 점수
 * @param change - 온도 변화량
 * @returns 새로운 온도 점수 (0 ~ 100 범위로 제한)
 */
export const applyTemperatureChange = (
  currentTemperature: number,
  change: number
): number => {
  const newTemperature = currentTemperature + change;
  return Math.min(100, Math.max(0, Math.round(newTemperature * 100) / 100));
};

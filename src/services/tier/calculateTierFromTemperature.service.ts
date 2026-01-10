import { TierType } from '@/commons/constants/tierType.enum';

/**
 * 온도 점수 기반 티어 계산 서비스
 *
 * 책임:
 * - 온도 점수를 기반으로 티어 결정
 * - 티어 범위:
 *   - 브론즈: 0 ~ 29
 *   - 실버: 30 ~ 44
 *   - 골드: 45 ~ 59
 *   - 플래티넘: 60 ~ 74
 *   - 다이아몬드: 75 ~ 87
 *   - 마스터: 88 ~ 94
 *   - 챌린저: 95 ~ 100
 */

/**
 * 온도 점수를 기반으로 티어 결정
 *
 * @param temperature - 온도 점수 (0 ~ 100)
 * @returns 티어 타입
 *
 * @example
 * ```typescript
 * const tier1 = calculateTierFromTemperature(25); // TierType.bronze
 * const tier2 = calculateTierFromTemperature(35); // TierType.silver
 * const tier3 = calculateTierFromTemperature(50); // TierType.gold
 * const tier4 = calculateTierFromTemperature(65); // TierType.platinum
 * const tier5 = calculateTierFromTemperature(80); // TierType.diamond
 * const tier6 = calculateTierFromTemperature(90); // TierType.master
 * const tier7 = calculateTierFromTemperature(98); // TierType.champion
 * ```
 */
export const calculateTierFromTemperature = (
  temperature: number
): TierType => {
  // 온도 범위를 0~100으로 제한
  const clampedTemperature = Math.min(100, Math.max(0, temperature));

  if (clampedTemperature >= 95) {
    return TierType.champion;
  }
  if (clampedTemperature >= 88) {
    return TierType.master;
  }
  if (clampedTemperature >= 75) {
    return TierType.diamond;
  }
  if (clampedTemperature >= 60) {
    return TierType.platinum;
  }
  if (clampedTemperature >= 45) {
    return TierType.gold;
  }
  if (clampedTemperature >= 30) {
    return TierType.silver;
  }
  return TierType.bronze;
};

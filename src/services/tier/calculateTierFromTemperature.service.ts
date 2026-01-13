import { TierType } from '@/commons/constants/tierType.enum';

/**
 * 온도 점수를 기반으로 티어 계산
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

const TIER_RANGES = [
  { tier: TierType.bronze, min: 0, max: 29 },
  { tier: TierType.silver, min: 30, max: 44 },
  { tier: TierType.gold, min: 45, max: 59 },
  { tier: TierType.platinum, min: 60, max: 74 },
  { tier: TierType.diamond, min: 75, max: 87 },
  { tier: TierType.master, min: 88, max: 94 },
  { tier: TierType.champion, min: 95, max: 100 },
] as const;

/**
 * 온도 점수를 기반으로 티어 계산
 *
 * @param temperatureScore - 온도 점수 (0 ~ 100)
 * @returns 티어 타입
 *
 * @example
 * ```typescript
 * const tier = calculateTierFromTemperature(30); // TierType.silver
 * const tier2 = calculateTierFromTemperature(45); // TierType.gold
 * ```
 */
export const calculateTierFromTemperature = (
  temperatureScore: number
): TierType => {
  // 점수 범위 제한 (0 ~ 100)
  const clampedScore = Math.max(0, Math.min(100, temperatureScore));

  // 티어 범위 찾기
  for (const range of TIER_RANGES) {
    if (clampedScore >= range.min && clampedScore <= range.max) {
      return range.tier;
    }
  }

  // 기본값 (브론즈)
  return TierType.bronze;
};

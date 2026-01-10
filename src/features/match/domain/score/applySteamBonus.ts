/**
 * ❗ Calculate Steam Compatibility Factor
 *
 * 📌 책임 (Responsibility):
 * - viewer와 target의 Steam 호환성 팩터 계산
 * - 공통 게임, 장르 유사도, Play Style 호환성을 종합
 * - baseScore와 독립적으로 계산되는 순수 팩터
 *
 * 📌 입력:
 * - context: MatchContext 입력
 *
 * 📌 출력:
 * - number: Steam 호환성 팩터 (1.0 ~ 1.10)
 *
 * 📌 개선된 계산 로직 (multiplicative factor):
 *
 * 1. 공통 게임 기여도: 50%
 *    - 공통 게임 1개당 2% (최대 5개 = 10%)
 *    - 최대 기여: +5%
 *
 * 2. 장르 유사도 기여도: 30%
 *    - 장르 유사도 80% 이상: +3%
 *    - 장르 유사도 60~80%: +2%
 *    - 장르 유사도 40~60%: +1%
 *    - 장르 유사도 < 40%: +0%
 *
 * 3. Play Style 호환성: 20%
 *    - 동일 스타일: +2%
 *    - 인접 스타일 (casual↔regular, regular↔hardcore): +1%
 *    - 불일치: +0% (❌ 절대 감점 없음)
 *
 * 최종: 1.0 ~ 1.10 범위 유지
 *
 * ⚠️ 핵심 원칙:
 * - 모든 보정은 가산만 (0% 이상)
 * - Steam 데이터가 없으면 factor = 1.0
 * - Steam이 "좋은 관계를 더 좋게" 만드는 역할
 */

import type { MatchContextCoreDTO } from '@/commons/types/match/matchContextCore.dto';
import { calculateGenreSimilarity } from '../utils/steamGenreSimilarity';

type PlayStyle = 'casual' | 'regular' | 'hardcore';

/**
 * Steam 호환성 팩터 계산
 *
 * @param context - MatchContext 입력
 * @returns Steam 호환성 팩터 (1.0 ~ 1.10)
 *
 * @example
 * ```typescript
 * // Steam 연동 + 공통 게임 3개
 * const context: MatchContextCoreDTO = {
 *   viewer: {
 *     userId: 'viewer-uuid',
 *     steam: { steamGames: [570, 730, 440] }
 *   },
 *   target: {
 *     userId: 'target-uuid',
 *     steam: { steamGames: [570, 730, 220] }
 *   }
 * };
 *
 * const factor = calculateSteamCompatibilityFactor(context); // 1.06
 * // 최종 점수 = baseScore × factor
 * // 예: 80점 × 1.06 = 84.8 → 85점
 * ```
 *
 * @example
 * ```typescript
 * // Steam 미연동
 * const context: MatchContextCoreDTO = {
 *   viewer: { userId: 'viewer-uuid' },
 *   target: { userId: 'target-uuid' }
 * };
 *
 * const factor = calculateSteamCompatibilityFactor(context); // 1.0
 * ```
 *
 * @example
 * ```typescript
 * // Steam 연동했지만 공통 게임 없음
 * const context: MatchContextCoreDTO = {
 *   viewer: {
 *     userId: 'viewer-uuid',
 *     steam: { steamGames: [570, 730] }
 *   },
 *   target: {
 *     userId: 'target-uuid',
 *     steam: { steamGames: [440, 220] }
 *   }
 * };
 *
 * const factor = calculateSteamCompatibilityFactor(context); // 1.0
 * ```
 */
/**
 * Play Style 호환성 계산
 */
const calculatePlayStyleCompatibility = (
  viewerStyle: PlayStyle | undefined,
  targetStyle: PlayStyle | undefined
): number => {
  if (!viewerStyle || !targetStyle) {
    return 0; // Play Style 정보 없으면 보정 없음
  }

  // 동일 스타일
  if (viewerStyle === targetStyle) {
    return 0.02; // +2%
  }

  // 인접 스타일
  const adjacentPairs = [
    ['casual', 'regular'],
    ['regular', 'hardcore'],
  ];

  for (const [style1, style2] of adjacentPairs) {
    if (
      (viewerStyle === style1 && targetStyle === style2) ||
      (viewerStyle === style2 && targetStyle === style1)
    ) {
      return 0.01; // +1%
    }
  }

  // 불일치 (casual ↔ hardcore)
  return 0; // +0% (절대 감점 없음)
};

export const calculateSteamCompatibilityFactor = (
  context: MatchContextCoreDTO
): number => {
  // Steam 데이터 가져오기
  const viewerSteam = context.viewer.steam;
  const targetSteam = context.target.steam;

  // Steam 미연동
  if (!viewerSteam || !targetSteam) {
    return 1.0;
  }

  let totalBonus = 0;

  // 1. 공통 게임 기여도 (50% = 최대 5%)
  const viewerGames = viewerSteam.steamGames ?? [];
  const targetGames = targetSteam.steamGames ?? [];

  if (viewerGames.length > 0 && targetGames.length > 0) {
    const commonGames = viewerGames.filter((game) =>
      targetGames.includes(game)
    );
    // 공통 게임 1개당 1% (최대 5개 = 5%)
    const commonCount = Math.min(commonGames.length, 5);
    totalBonus += commonCount * 0.01;
  }

  // 2. 장르 유사도 기여도 (30% = 최대 3%)
  const viewerGenres = viewerSteam.mainGenres ?? [];
  const targetGenres = targetSteam.mainGenres ?? [];

  if (viewerGenres.length > 0 && targetGenres.length > 0) {
    const genreSimilarity = calculateGenreSimilarity(
      viewerGenres,
      targetGenres
    );

    if (genreSimilarity >= 80) {
      totalBonus += 0.03; // +3%
    } else if (genreSimilarity >= 60) {
      totalBonus += 0.02; // +2%
    } else if (genreSimilarity >= 40) {
      totalBonus += 0.01; // +1%
    }
    // < 40%: +0%
  }

  // 3. Play Style 호환성 (20% = 최대 2%)
  const playStyleBonus = calculatePlayStyleCompatibility(
    viewerSteam.playStyle,
    targetSteam.playStyle
  );
  totalBonus += playStyleBonus;

  // 최종 팩터 (1.0 ~ 1.10 범위)
  const factor = 1.0 + Math.min(totalBonus, 0.1);

  return factor;
};

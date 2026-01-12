/**
 * 📌 Domain Layer - Traits to Game Style Converter
 *
 * - 순수 함수: 외부 상태(useState, hook, fetch, console 등)에 의존하지 않음
 * - 입력 → 출력이 명확한 변환 함수
 * - UI 레이어와 분리
 * - i18n / 번역 키 처리 미포함
 */

import type { TraitVector } from '@/commons/constants/animal/animal.vector';

/**
 * Traits를 기반으로 게임 성향 텍스트를 생성
 *
 * @param traits - TraitVector | null | undefined
 * @returns string | undefined - "경쟁적", "협력적", "탐험적" 등
 */
export const toGameStyleFromTraits = (
  traits: TraitVector | null | undefined
): string | undefined => {
  if (!traits) {
    return undefined;
  }

  // 각 trait의 평균값 계산
  const avgValue =
    (traits.cooperation +
      traits.exploration +
      traits.strategy +
      traits.leadership +
      traits.social) /
    5;

  // leadership과 strategy가 높으면 경쟁적
  // cooperation과 social이 높으면 협력적
  // exploration이 높으면 탐험적

  const competitiveScore = (traits.leadership + traits.strategy) / 2;
  const cooperativeScore = (traits.cooperation + traits.social) / 2;
  const exploratoryScore = traits.exploration;

  // 가장 높은 점수를 가진 성향 반환
  if (competitiveScore >= cooperativeScore && competitiveScore >= exploratoryScore) {
    return '경쟁적';
  } else if (cooperativeScore >= exploratoryScore) {
    return '협력적';
  } else {
    return '탐험적';
  }
};


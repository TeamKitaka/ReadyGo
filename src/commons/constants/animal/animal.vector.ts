/**
 * 동물별 이상적 특성 벡터
 *
 * 각 동물의 "이상적 플레이 스타일"을 5차원 벡터로 표현
 * 사용자의 답변으로 계산된 벡터와의 거리를 측정하여 가장 가까운 동물을 매칭
 */

import { AnimalType } from './animal.enum';
import type { TraitKey } from './trait.enum';

/**
 * 5가지 특성의 벡터 (각 0~100)
 */
export type TraitVector = {
  cooperation: number; // 협동성
  exploration: number; // 모험성
  strategy: number; // 전략성
  leadership: number; // 리더십
  social: number; // 교류성
};

/**
 * 동물별 이상적 특성 벡터 (V2 - Dominant Axis 분화 적용)
 *
 * 각 값은 0~100 범위:
 * - 85~100: 매우 높음 (Dominant Axis)
 * - 70~84:  높음
 * - 50~69:  중간
 * - 30~49:  낮음
 * - 0~29:   매우 낮음
 *
 * 설계 원칙:
 * 1. Radial Clipping: 중심(50)에서 극단적으로 벗어나지 않도록 조정
 * 2. Dominant Axis: 겹치는 동물들을 방향으로 차별화
 *    - Wolf vs Dog: Leadership 차이 (85 vs 70)
 *    - Dolphin vs Dog: Leadership 반대 (35 vs 70)
 *    - Hawk vs Cat: Exploration 차이 (58 vs 45)
 * 3. 극단값 완화: 3개 이상의 극단값을 가진 동물 조정
 */
export const ANIMAL_VECTORS: Partial<Record<AnimalType, TraitVector>> = {
  // ========== ATTACK / DRIVE 그룹 ==========
  // Wolf: 리더십 + 드라이브 (Dog와 분화: leadership↑, social↓)
  [AnimalType.wolf]: {
    cooperation: 58,
    exploration: 78,
    strategy: 58,
    leadership: 85,
    social: 52,
  },
  // Tiger: 돌파/도전 (exploration↑↑, cooperation/social↓)
  [AnimalType.tiger]: {
    cooperation: 38,
    exploration: 85,
    strategy: 42,
    leadership: 60,
    social: 35,
  },
  // Hawk: 정밀 분석 딜러 (strategy↑, Cat과 분화: exploration↑)
  [AnimalType.hawk]: {
    cooperation: 40,
    exploration: 58,
    strategy: 82,
    leadership: 35,
    social: 35,
  },

  // ========== STRATEGY 그룹 ==========
  // Owl: 운영/장기전 (strategy↑, exploration↓, Hedgehog보다 social/leadership↑)
  [AnimalType.owl]: {
    cooperation: 40,
    exploration: 35,
    strategy: 85,
    leadership: 58,
    social: 35,
  },
  // Fox: 심리전/유연함 (strategy↑ + social/cooperation 중간)
  [AnimalType.fox]: {
    cooperation: 58,
    exploration: 60,
    strategy: 78,
    leadership: 40,
    social: 58,
  },
  // Hedgehog: 연구 몰입 (strategy↑↑, social↓↓, 극단값 완화)
  [AnimalType.hedgehog]: {
    cooperation: 42,
    exploration: 38,
    strategy: 88,
    leadership: 38,
    social: 25,
  },
  // Raven: 독해/계산 + 팀 기여 (strategy↑ + cooperation↑)
  [AnimalType.raven]: {
    cooperation: 62,
    exploration: 42,
    strategy: 80,
    leadership: 35,
    social: 38,
  },

  // ========== SUPPORT 그룹 ==========
  // Bear: 보호/안정 (cooperation↑↑, Panda와 분화: strategy↓)
  [AnimalType.bear]: {
    cooperation: 85,
    exploration: 40,
    strategy: 55,
    leadership: 60,
    social: 58,
  },
  // Deer: 힐링/차분 (cooperation/social 중상, leadership↓, Koala와 분화)
  [AnimalType.deer]: {
    cooperation: 62,
    exploration: 35,
    strategy: 45,
    leadership: 30,
    social: 60,
  },
  // Koala: 캐주얼/감성 (social↑, exploration↓, Deer와 분화: social↑↑)
  [AnimalType.koala]: {
    cooperation: 55,
    exploration: 30,
    strategy: 35,
    leadership: 25,
    social: 75,
  },

  // ========== SOCIAL 그룹 ==========
  // Dog: 케미 + 리더 (cooperation/social/leadership 높음, Dolphin과 분화: leadership↑↑)
  [AnimalType.dog]: {
    cooperation: 82,
    exploration: 58,
    strategy: 38,
    leadership: 70,
    social: 82,
  },
  // Dolphin: 텐션 파티 (social↑↑, Dog와 분화: leadership↓)
  [AnimalType.dolphin]: {
    cooperation: 78,
    exploration: 62,
    strategy: 35,
    leadership: 35,
    social: 90,
  },
  // Panda: 무난 균형 (cooperation/social 높고 strategy도 중상, Bear와 분화: strategy↑)
  [AnimalType.panda]: {
    cooperation: 75,
    exploration: 38,
    strategy: 68,
    leadership: 35,
    social: 78,
  },
  // Rabbit: 밝은 소셜러 (social↑↑ + exploration 중상)
  [AnimalType.rabbit]: {
    cooperation: 60,
    exploration: 65,
    strategy: 30,
    leadership: 28,
    social: 88,
  },

  // ========== LONE 그룹 ==========
  // Leopard: 경쟁/성능 (exploration↑ + strategy/leadership 중상)
  [AnimalType.leopard]: {
    cooperation: 40,
    exploration: 80,
    strategy: 65,
    leadership: 60,
    social: 40,
  },
  // Cat: 잠입/고독 (strategy 중상, cooperation/social↓, Hawk와 분화: exploration↓)
  [AnimalType.cat]: {
    cooperation: 28,
    exploration: 45,
    strategy: 78,
    leadership: 30,
    social: 28,
  },
};

/**
 * 특정 동물의 벡터를 반환
 * unknown 타입은 벡터가 없으므로 에러를 던집니다.
 */
export const getAnimalVector = (animal: AnimalType): TraitVector => {
  const vector = ANIMAL_VECTORS[animal];
  if (!vector) {
    throw new Error(
      `Animal vector not found for type: ${animal}. Unknown type does not have a vector.`
    );
  }
  return vector;
};

/**
 * 모든 특성 키 배열
 */
export const TRAIT_KEYS: TraitKey[] = [
  'cooperation',
  'exploration',
  'strategy',
  'leadership',
  'social',
];

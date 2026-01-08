/**
 * Animal Compatibility Data
 * 천생연분 / 궁합 데이터
 */

import { AnimalType, getAllAnimalTypes } from './animal.enum';

// ============================================
// Compatibility Type Definition
// ============================================

export type AnimalCompatibility = {
  bestMatches: AnimalType[]; // 천생연분
  goodMatches: AnimalType[]; // 좋은 궁합
  neutralMatches: AnimalType[]; // 중립
  challengingMatches: AnimalType[]; // 도전적인 궁합
};

// ============================================
// Compatibility Data (현재 미정의)
// ============================================

/**
 * 동물 타입별 궁합 데이터
 *
 * - bestMatches: 천생연분 (최고의 궁합)
 * - goodMatches: 좋은 궁합
 * - neutralMatches: 중립적인 관계
 * - challengingMatches: 도전적인 궁합 (서로 다른 성향으로 갈등 가능)
 */
export const animalCompatibilities: Record<AnimalType, AnimalCompatibility> = {
  [AnimalType.wolf]: {
    bestMatches: [AnimalType.bear],
    goodMatches: [AnimalType.fox],
    neutralMatches: [AnimalType.dog, AnimalType.owl],
    challengingMatches: [AnimalType.tiger, AnimalType.leopard],
  },

  [AnimalType.tiger]: {
    bestMatches: [AnimalType.bear],
    goodMatches: [AnimalType.owl],
    neutralMatches: [AnimalType.fox, AnimalType.wolf],
    challengingMatches: [AnimalType.dog, AnimalType.panda],
  },

  [AnimalType.hawk]: {
    bestMatches: [AnimalType.wolf],
    goodMatches: [AnimalType.bear],
    neutralMatches: [AnimalType.fox, AnimalType.owl],
    challengingMatches: [AnimalType.cat],
  },

  [AnimalType.owl]: {
    bestMatches: [AnimalType.tiger],
    goodMatches: [AnimalType.bear],
    neutralMatches: [AnimalType.raven, AnimalType.hawk],
    challengingMatches: [AnimalType.rabbit],
  },

  [AnimalType.fox]: {
    bestMatches: [AnimalType.wolf],
    goodMatches: [AnimalType.dog],
    neutralMatches: [AnimalType.tiger, AnimalType.raven],
    challengingMatches: [AnimalType.hawk],
  },

  [AnimalType.hedgehog]: {
    bestMatches: [AnimalType.bear],
    goodMatches: [AnimalType.wolf],
    neutralMatches: [AnimalType.owl, AnimalType.raven],
    challengingMatches: [AnimalType.dolphin, AnimalType.dog],
  },

  [AnimalType.raven]: {
    bestMatches: [AnimalType.wolf],
    goodMatches: [AnimalType.bear],
    neutralMatches: [AnimalType.fox, AnimalType.owl],
    challengingMatches: [AnimalType.dolphin],
  },

  [AnimalType.bear]: {
    bestMatches: [AnimalType.tiger],
    goodMatches: [AnimalType.wolf],
    neutralMatches: [AnimalType.panda, AnimalType.deer],
    challengingMatches: [AnimalType.rabbit],
  },

  [AnimalType.deer]: {
    bestMatches: [AnimalType.dog],
    goodMatches: [AnimalType.bear],
    neutralMatches: [AnimalType.panda, AnimalType.fox],
    challengingMatches: [AnimalType.tiger],
  },

  [AnimalType.koala]: {
    bestMatches: [AnimalType.dog],
    goodMatches: [AnimalType.panda],
    neutralMatches: [AnimalType.rabbit, AnimalType.deer],
    challengingMatches: [AnimalType.leopard],
  },

  [AnimalType.dog]: {
    bestMatches: [AnimalType.deer],
    goodMatches: [AnimalType.fox],
    neutralMatches: [AnimalType.wolf, AnimalType.panda],
    challengingMatches: [AnimalType.tiger],
  },

  [AnimalType.dolphin]: {
    bestMatches: [AnimalType.panda],
    goodMatches: [AnimalType.dog],
    neutralMatches: [AnimalType.rabbit, AnimalType.fox],
    challengingMatches: [AnimalType.hedgehog],
  },

  [AnimalType.panda]: {
    bestMatches: [AnimalType.dolphin],
    goodMatches: [AnimalType.bear],
    neutralMatches: [AnimalType.dog, AnimalType.deer],
    challengingMatches: [AnimalType.tiger],
  },

  [AnimalType.rabbit]: {
    bestMatches: [AnimalType.bear],
    goodMatches: [AnimalType.dog],
    neutralMatches: [AnimalType.fox, AnimalType.koala],
    challengingMatches: [AnimalType.owl],
  },

  [AnimalType.leopard]: {
    bestMatches: [AnimalType.bear],
    goodMatches: [AnimalType.owl],
    neutralMatches: [AnimalType.wolf, AnimalType.tiger],
    challengingMatches: [AnimalType.koala],
  },

  [AnimalType.cat]: {
    bestMatches: [AnimalType.wolf],
    goodMatches: [AnimalType.bear],
    neutralMatches: [AnimalType.owl, AnimalType.raven],
    challengingMatches: [AnimalType.hawk, AnimalType.dolphin],
  },

  // ========== uninitialized 그룹 ==========
  [AnimalType.unknown]: {
    bestMatches: [],
    goodMatches: [],
    neutralMatches: getAllAnimalTypes().filter(
      (type) => type !== AnimalType.unknown
    ),
    challengingMatches: [],
  },
};

// ============================================
// Utilities
// ============================================

/**
 * 동물 타입의 궁합 데이터를 반환
 */
export const getAnimalCompatibility = (
  type: AnimalType
): AnimalCompatibility | undefined => {
  return animalCompatibilities[type];
};

/**
 * 두 동물 타입 간의 궁합 정도를 반환
 * @returns 'best' | 'good' | 'neutral' | 'challenging' | 'unknown'
 */
export const getCompatibilityLevel = (
  type1: AnimalType,
  type2: AnimalType
): 'best' | 'good' | 'neutral' | 'challenging' | 'unknown' => {
  const compat = animalCompatibilities[type1];
  if (!compat) {
    return 'unknown';
  }

  if (compat.bestMatches?.includes(type2)) {
    return 'best';
  }
  if (compat.goodMatches?.includes(type2)) {
    return 'good';
  }
  if (compat.challengingMatches?.includes(type2)) {
    return 'challenging';
  }
  if (compat.neutralMatches?.includes(type2)) {
    return 'neutral';
  }

  return 'unknown';
};

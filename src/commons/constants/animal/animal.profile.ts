/**
 * Animal Profile Data
 * 성향 및 매칭용 데이터 (dominantTraits, secondaryTraits, avoidTraits, group)
 */

import { AnimalType, AnimalGroup } from './animal.enum';
import type { TraitKey } from './trait.enum';

// ============================================
// Profile Type Definition
// ============================================

export type AnimalProfile = {
  group: AnimalGroup;
  dominantTraits: TraitKey[];
  secondaryTraits: TraitKey[];
  avoidTraits: TraitKey[];
};

// ============================================
// Profile Data
// ============================================

export const animalProfiles: Record<AnimalType, AnimalProfile> = {
  // ========== attack 그룹 ==========
  [AnimalType.wolf]: {
    group: AnimalGroup.attack,
    dominantTraits: ['exploration', 'leadership'],
    secondaryTraits: ['cooperation', 'social'],
    avoidTraits: ['strategy'],
  },
  [AnimalType.tiger]: {
    group: AnimalGroup.attack,
    dominantTraits: ['exploration'],
    secondaryTraits: ['leadership'],
    avoidTraits: ['cooperation', 'strategy', 'social'],
  },
  [AnimalType.hawk]: {
    group: AnimalGroup.attack,
    dominantTraits: ['strategy'],
    secondaryTraits: ['exploration'],
    avoidTraits: ['cooperation', 'leadership', 'social'],
  },

  // ========== strategy 그룹 ==========
  [AnimalType.owl]: {
    group: AnimalGroup.strategy,
    dominantTraits: ['strategy'],
    secondaryTraits: ['leadership'],
    avoidTraits: ['cooperation', 'exploration', 'social'],
  },
  [AnimalType.fox]: {
    group: AnimalGroup.strategy,
    dominantTraits: ['strategy'],
    secondaryTraits: ['cooperation', 'exploration', 'social'],
    avoidTraits: ['leadership'],
  },
  [AnimalType.hedgehog]: {
    group: AnimalGroup.strategy,
    dominantTraits: ['strategy'],
    secondaryTraits: ['exploration'],
    avoidTraits: ['cooperation', 'leadership', 'social'],
  },
  [AnimalType.raven]: {
    group: AnimalGroup.strategy,
    dominantTraits: ['strategy'],
    secondaryTraits: ['cooperation'],
    avoidTraits: ['exploration', 'leadership', 'social'],
  },

  // ========== support 그룹 ==========
  [AnimalType.bear]: {
    group: AnimalGroup.support,
    dominantTraits: ['cooperation'],
    secondaryTraits: ['strategy', 'leadership', 'social'],
    avoidTraits: ['exploration'],
  },
  [AnimalType.deer]: {
    group: AnimalGroup.support,
    dominantTraits: ['cooperation'],
    secondaryTraits: ['social'],
    avoidTraits: ['exploration', 'strategy', 'leadership'],
  },
  [AnimalType.koala]: {
    group: AnimalGroup.support,
    dominantTraits: ['social'],
    secondaryTraits: ['cooperation'],
    avoidTraits: ['exploration', 'strategy', 'leadership'],
  },

  // ========== social 그룹 ==========
  [AnimalType.dog]: {
    group: AnimalGroup.social,
    dominantTraits: ['cooperation', 'social'],
    secondaryTraits: ['exploration', 'leadership'],
    avoidTraits: ['strategy'],
  },
  [AnimalType.dolphin]: {
    group: AnimalGroup.social,
    dominantTraits: ['cooperation', 'social'],
    secondaryTraits: ['exploration'],
    avoidTraits: ['strategy', 'leadership'],
  },
  [AnimalType.panda]: {
    group: AnimalGroup.social,
    dominantTraits: ['cooperation', 'social'],
    secondaryTraits: ['strategy'],
    avoidTraits: ['exploration', 'leadership'],
  },
  [AnimalType.rabbit]: {
    group: AnimalGroup.social,
    dominantTraits: ['social'],
    secondaryTraits: ['cooperation', 'exploration'],
    avoidTraits: ['strategy', 'leadership'],
  },

  // ========== lone 그룹 ==========
  [AnimalType.leopard]: {
    group: AnimalGroup.lone,
    dominantTraits: ['exploration'],
    secondaryTraits: ['strategy', 'leadership'],
    avoidTraits: ['cooperation', 'social'],
  },
  [AnimalType.cat]: {
    group: AnimalGroup.lone,
    dominantTraits: ['strategy'],
    secondaryTraits: ['exploration'],
    avoidTraits: ['cooperation', 'leadership', 'social'],
  },

  // ========== uninitialized 그룹 ==========
  [AnimalType.unknown]: {
    group: AnimalGroup.uninitialized,
    dominantTraits: [],
    secondaryTraits: [],
    avoidTraits: [],
  },
} as const;

// ============================================
// Utilities
// ============================================

/**
 * 동물 타입의 프로필 데이터를 반환
 */
export const getAnimalProfile = (type: AnimalType): AnimalProfile => {
  return animalProfiles[type];
};

/**
 * 특정 그룹에 속하는 동물 타입들을 반환
 */
export const getAnimalTypesByGroup = (group: AnimalGroup): AnimalType[] => {
  return Object.entries(animalProfiles)
    .filter(([_, profile]) => profile.group === group)
    .map(([type]) => type as AnimalType);
};

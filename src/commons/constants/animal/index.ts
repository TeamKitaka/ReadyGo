/**
 * Animal Constants Barrel Export
 * 동물 타입 관련 모든 상수 및 유틸리티 통합 export
 */

// ============================================
// Enums & Types
// ============================================
import { AnimalType, AnimalGroup, getAllAnimalTypes } from './animal.enum';
import type { TraitKey } from './trait.enum';

export { AnimalType, AnimalGroup, getAllAnimalTypes };
export { type TraitKey, traitLabels, radarTraitLabels } from './trait.enum';
export type { RadarTraitKey } from './trait.enum';

// ============================================
// Profile Data
// ============================================
import {
  type AnimalProfile,
  animalProfiles,
  getAnimalProfile,
  getAnimalTypesByGroup,
} from './animal.profile';

export {
  type AnimalProfile,
  animalProfiles,
  getAnimalProfile,
  getAnimalTypesByGroup,
};

// ============================================
// Vector Data
// ============================================
import {
  type TraitVector,
  ANIMAL_VECTORS,
  getAnimalVector,
  TRAIT_KEYS,
} from './animal.vector';

export { type TraitVector, ANIMAL_VECTORS, getAnimalVector, TRAIT_KEYS };

// ============================================
// Copy Data
// ============================================
import { type AnimalCopy, animalCopies, getAnimalCopy } from './animal.copy';

export { type AnimalCopy, animalCopies, getAnimalCopy };

// ============================================
// Assets Data
// ============================================
import {
  type AnimalAssets,
  animalAssets,
  getAnimalAssets,
} from './animal.assets';

export { type AnimalAssets, animalAssets, getAnimalAssets };

// ============================================
// Compatibility Data
// ============================================
export {
  type AnimalCompatibility,
  animalCompatibilities,
  getAnimalCompatibility,
  getCompatibilityLevel,
} from './animal.compat';

// ============================================
// Combined Type (기존 호환성)
// ============================================

/**
 * 기존 AnimalTypeMeta와 호환되는 통합 타입
 */
export type AnimalTypeMeta = {
  label: string;
  group: AnimalGroup;
  description: string[];
  extendedDescription: string;
  dominantTraits: TraitKey[];
  secondaryTraits: TraitKey[];
  avoidTraits: TraitKey[];
  mainRole: {
    name: string;
    description: string;
  };
  subRole: {
    name: string;
    description: string;
  };
  checkSentences: string[];
  unknownDescriptions?: {
    my: string;
    user: string;
  };
  ui: {
    imageS: string;
    imageM: string;
    avatar: string;
  };
};

/**
 * 기존 animalTypeMeta와 호환되는 통합 객체
 */
export const animalTypeMeta: Record<AnimalType, AnimalTypeMeta> =
  getAllAnimalTypes().reduce(
    (acc, type) => {
      const profile = animalProfiles[type];
      const copy = animalCopies[type];
      const assets = animalAssets[type];

      acc[type] = {
        label: copy.label,
        group: profile.group,
        description: copy.description,
        extendedDescription: copy.extendedDescription,
        dominantTraits: profile.dominantTraits,
        secondaryTraits: profile.secondaryTraits,
        avoidTraits: profile.avoidTraits,
        mainRole: copy.mainRole,
        subRole: copy.subRole,
        checkSentences: copy.checkSentences,
        unknownDescriptions: copy.unknownDescriptions,
        ui: assets,
      };

      return acc;
    },
    {} as Record<AnimalType, AnimalTypeMeta>
  );

/**
 * 동물 타입의 메타데이터를 반환 (기존 함수 호환)
 */
export const getAnimalTypeMeta = (type: AnimalType): AnimalTypeMeta => {
  return animalTypeMeta[type];
};

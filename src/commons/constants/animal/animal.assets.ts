/**
 * Animal Assets Data
 * 이미지 경로 등 UI 리소스
 */

import { AnimalType } from './animal.enum';

// ============================================
// Assets Type Definition
// ============================================

export type AnimalAssets = {
  imageS: string;
  imageM: string;
  avatar: string;
};

// ============================================
// Assets Data
// ============================================

export const animalAssets: Record<AnimalType, AnimalAssets> = {
  [AnimalType.wolf]: {
    imageS: '/images/wolf_s.svg',
    imageM: '/images/wolf_m.svg',
    avatar: '/icons/avatar/wolf.svg',
  },
  [AnimalType.tiger]: {
    imageS: '/images/tiger_s.svg',
    imageM: '/images/tiger_m.svg',
    avatar: '/icons/avatar/tiger.svg',
  },
  [AnimalType.hawk]: {
    imageS: '/images/hawk_s.svg',
    imageM: '/images/hawk_m.svg',
    avatar: '/icons/avatar/hawk.svg',
  },
  [AnimalType.owl]: {
    imageS: '/images/owl_s.svg',
    imageM: '/images/owl_m.svg',
    avatar: '/icons/avatar/owl.svg',
  },
  [AnimalType.fox]: {
    imageS: '/images/fox_s.svg',
    imageM: '/images/fox_m.svg',
    avatar: '/icons/avatar/fox.svg',
  },
  [AnimalType.hedgehog]: {
    imageS: '/images/hedgehog_s.svg',
    imageM: '/images/hedgehog_m.svg',
    avatar: '/icons/avatar/hedgehog.svg',
  },
  [AnimalType.raven]: {
    imageS: '/images/raven_s.svg',
    imageM: '/images/raven_m.svg',
    avatar: '/icons/avatar/raven.svg',
  },
  [AnimalType.bear]: {
    imageS: '/images/bear_s.svg',
    imageM: '/images/bear_m.svg',
    avatar: '/icons/avatar/bear.svg',
  },
  [AnimalType.deer]: {
    imageS: '/images/deer_s.svg',
    imageM: '/images/deer_m.svg',
    avatar: '/icons/avatar/deer.svg',
  },
  [AnimalType.koala]: {
    imageS: '/images/koala_s.svg',
    imageM: '/images/koala_m.svg',
    avatar: '/icons/avatar/koala.svg',
  },
  [AnimalType.dog]: {
    imageS: '/images/dog_s.svg',
    imageM: '/images/dog_m.svg',
    avatar: '/icons/avatar/dog.svg',
  },
  [AnimalType.dolphin]: {
    imageS: '/images/dolphin_s.svg',
    imageM: '/images/dolphin_m.svg',
    avatar: '/icons/avatar/dolphin.svg',
  },
  [AnimalType.panda]: {
    imageS: '/images/panda_s.svg',
    imageM: '/images/panda_m.svg',
    avatar: '/icons/avatar/panda.svg',
  },
  [AnimalType.rabbit]: {
    imageS: '/images/rabbit_s.svg',
    imageM: '/images/rabbit_m.svg',
    avatar: '/icons/avatar/rabbit.svg',
  },
  [AnimalType.leopard]: {
    imageS: '/images/leopard_s.svg',
    imageM: '/images/leopard_m.svg',
    avatar: '/icons/avatar/leopard.svg',
  },
  [AnimalType.cat]: {
    imageS: '/images/cat_s.svg',
    imageM: '/images/cat_m.svg',
    avatar: '/icons/avatar/cat.svg',
  },
  [AnimalType.unknown]: {
    imageS: '/images/unknown_m.svg',
    imageM: '/images/unknown_m.svg',
    avatar: '/icons/avatar/unknown.svg',
  },
} as const;

// ============================================
// Utilities
// ============================================

/**
 * 동물 타입의 에셋 데이터를 반환
 */
export const getAnimalAssets = (type: AnimalType): AnimalAssets => {
  return animalAssets[type];
};

/**
 * 벡터 거리 기반 동물 유형 결정 모듈
 *
 * 사용자의 특성 벡터와 각 동물의 이상적 벡터 간의 거리를 계산하여
 * 가장 가까운(유사한) 동물을 매칭합니다.
 */

import { AnimalType } from '@/commons/constants/animal/animal.enum';
import { ANIMAL_VECTORS } from '@/commons/constants/animal/animal.vector';
import type { TraitVector } from '@/commons/constants/animal/animal.vector';
import { calculateEuclideanDistance } from './calculateVectorDistance';

/**
 * 거리 계산 결과
 */
export type AnimalDistanceResult = {
  animal: AnimalType;
  distance: number;
  vector: TraitVector;
};

/**
 * 벡터 거리 기반으로 가장 적합한 동물 유형을 결정
 *
 * @param userVector - 사용자의 특성 벡터 (0~100)
 * @returns 가장 가까운 동물 유형
 *
 * @example
 * ```ts
 * const userVector = {
 *   cooperation: 70,
 *   exploration: 60,
 *   strategy: 50,
 *   leadership: 80,
 *   social: 65
 * };
 * const animal = resolveAnimalTypeByVector(userVector);
 * // AnimalType.WOLF (리더십+모험성이 높아 늑대와 유사)
 * ```
 *
 * 계산 방식:
 * 1. 각 동물의 이상적 벡터와 사용자 벡터 간의 유클리드 거리 계산
 * 2. 거리가 가장 짧은(가장 유사한) 동물 선택
 *
 * 거리 공식:
 * distance = sqrt(
 *   (user.cooperation - animal.cooperation)^2 +
 *   (user.exploration - animal.exploration)^2 +
 *   (user.strategy - animal.strategy)^2 +
 *   (user.leadership - animal.leadership)^2 +
 *   (user.social - animal.social)^2
 * )
 */
export const resolveAnimalTypeByVector = (
  userVector: TraitVector
): AnimalType => {
  // 모든 동물과의 거리 계산 (unknown 제외)
  const distances = (
    Object.entries(ANIMAL_VECTORS) as [AnimalType, TraitVector][]
  )
    .filter(([animal]) => animal !== AnimalType.unknown)
    .map(([animal, animalVector]) => ({
      animal,
      distance: calculateEuclideanDistance(userVector, animalVector),
      vector: animalVector,
    }));

  // 가장 가까운 동물 선택 (거리가 짧을수록 유사함)
  const closest = distances.reduce((best, current) =>
    current.distance < best.distance ? current : best
  );

  return closest.animal;
};

/**
 * 상위 N개의 유사한 동물 목록 반환 (디버깅/분석용)
 *
 * @param userVector - 사용자의 특성 벡터
 * @param topN - 반환할 동물 수 (기본값: 3)
 * @returns 거리가 가까운 순서대로 정렬된 동물 목록
 *
 * @example
 * ```ts
 * const results = getTopMatchingAnimals(userVector, 5);
 * // [
 * //   { animal: 'wolf', distance: 15.8, vector: {...} },
 * //   { animal: 'dog', distance: 23.4, vector: {...} },
 * //   { animal: 'bear', distance: 28.7, vector: {...} },
 * //   ...
 * // ]
 * ```
 */
export const getTopMatchingAnimals = (
  userVector: TraitVector,
  topN: number = 3
): AnimalDistanceResult[] => {
  const distances = (
    Object.entries(ANIMAL_VECTORS) as [AnimalType, TraitVector][]
  )
    .filter(([animal]) => animal !== AnimalType.unknown)
    .map(([animal, animalVector]) => ({
      animal,
      distance: calculateEuclideanDistance(userVector, animalVector),
      vector: animalVector,
    }));

  // 거리가 짧은 순서로 정렬
  return distances.sort((a, b) => a.distance - b.distance).slice(0, topN);
};

/**
 * 모든 동물과의 거리 정보 반환 (디버깅용)
 *
 * @param userVector - 사용자의 특성 벡터
 * @returns 모든 동물과의 거리 정보 (거리 순 정렬)
 */
export const getAllAnimalDistances = (
  userVector: TraitVector
): AnimalDistanceResult[] => {
  return getTopMatchingAnimals(userVector, 16);
};

/**
 * 사용자 벡터와 동물 벡터 간의 특성별 차이 분석
 *
 * @param userVector - 사용자의 특성 벡터
 * @param animal - 비교할 동물
 * @returns 특성별 차이값
 *
 * @example
 * ```ts
 * const diff = analyzeVectorDifference(userVector, AnimalType.WOLF);
 * // {
 * //   cooperation: -10,  // 사용자가 10점 낮음
 * //   exploration: 5,    // 사용자가 5점 높음
 * //   ...
 * // }
 * ```
 */
export const analyzeVectorDifference = (
  userVector: TraitVector,
  animal: AnimalType
): TraitVector => {
  const animalVector = ANIMAL_VECTORS[animal];
  if (!animalVector) {
    throw new Error(
      `Animal vector not found for type: ${animal}. Unknown type does not have a vector.`
    );
  }

  return {
    cooperation: userVector.cooperation - animalVector.cooperation,
    exploration: userVector.exploration - animalVector.exploration,
    strategy: userVector.strategy - animalVector.strategy,
    leadership: userVector.leadership - animalVector.leadership,
    social: userVector.social - animalVector.social,
  };
};

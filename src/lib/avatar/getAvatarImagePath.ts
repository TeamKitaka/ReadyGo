/**
 * 아바타 이미지 경로를 결정하는 유틸리티 함수
 *
 * 선택 우선순위:
 * 1. avatar_url (사용자가 커스텀한 아바타)
 * 2. animal_type (동물 타입에 따른 기본 아바타)
 * 3. 기본값 (unknown 아바타 - 회원가입 시 기본값)
 *
 * @param avatarUrl - user_profiles.avatar_url (string | null | undefined)
 * @param animalType - user_profiles.animal_type (string | null | undefined)
 * @returns 아바타 이미지 경로 (string)
 */
import { getAnimalAssets } from '@/commons/constants/animal';
import { AnimalType } from '@/commons/constants/animal';

export const getAvatarImagePath = (
  avatarUrl: string | null | undefined,
  animalType: string | null | undefined
): string => {
  // 1. avatar_url이 null이 아니고 빈 문자열이 아닌 경우: avatar_url 사용
  if (avatarUrl) {
    return avatarUrl;
  }

  // 2. avatar_url이 null이거나 없으면 animal_type으로 동물 타입 이미지 가져오기
  if (animalType) {
    try {
      const animalAssets = getAnimalAssets(animalType as AnimalType);
      return animalAssets.avatar;
    } catch {
      // animalType이 유효하지 않은 경우 기본값 사용
    }
  }

  // 3. 둘 다 없으면 기본값 (unknown 아바타 - 회원가입 시 기본값)
  const defaultAnimalAssets = getAnimalAssets(AnimalType.unknown);
  return defaultAnimalAssets.avatar;
};

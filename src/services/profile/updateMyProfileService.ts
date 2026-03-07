import * as userProfilesRepository from '@/repositories/userProfiles.repository';
import {
  getAllAnimalTypes,
  getAnimalAssets,
  type AnimalType,
} from '@/commons/constants/animal';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const MAX_NICKNAME_LENGTH = 8;

const getCharLength = (value: string): number => Array.from(value).length;

const getAllowedAvatarUrls = (): Set<string> => {
  const avatarUrls = getAllAnimalTypes().map(
    (animalType) => getAnimalAssets(animalType as AnimalType).avatar
  );
  return new Set(avatarUrls);
};

/**
 * 내 프로필(닉네임/아바타) 업데이트 Service
 *
 * 책임:
 * - 닉네임 trim 및 길이 검증
 * - avatar_url 허용값 검증(Animal asset만 허용)
 * - Repository를 통해 user_profiles 업데이트
 */
export const updateMyProfileService = async (
  client: SupabaseClient<Database>,
  userId: string,
  params: {
    nickname: string;
    avatarUrl?: string;
  }
) => {
  const trimmedNickname = params.nickname.trim();
  const nicknameLength = getCharLength(trimmedNickname);

  if (!trimmedNickname) {
    throw new Error('닉네임은 비어 있을 수 없습니다.');
  }

  if (nicknameLength > MAX_NICKNAME_LENGTH) {
    throw new Error(
      `닉네임은 최대 ${MAX_NICKNAME_LENGTH}자까지 입력할 수 있습니다.`
    );
  }

  if (params.avatarUrl !== undefined) {
    const allowedAvatarUrls = getAllowedAvatarUrls();
    if (!allowedAvatarUrls.has(params.avatarUrl)) {
      throw new Error('유효하지 않은 아바타 경로입니다.');
    }
  }

  const { error } = await userProfilesRepository.updateProfileBasics(
    client,
    userId,
    {
      nickname: trimmedNickname,
      avatarUrl: params.avatarUrl,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return {
    nickname: trimmedNickname,
    avatarUrl: params.avatarUrl,
  };
};

import * as userProfilesRepository from '@/repositories/userProfiles.repository';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const MAX_NICKNAME_LENGTH = 8;

const getCharLength = (value: string): number => Array.from(value).length;

/**
 * 내 닉네임 업데이트 Service
 *
 * 책임:
 * - 닉네임 trim 및 길이 검증
 * - Repository를 통해 user_profiles.nickname 업데이트
 *
 * 비책임:
 * - 인증/인가 체크 (Route에서 처리)
 */
export const updateMyNicknameService = async (
  client: SupabaseClient<Database>,
  userId: string,
  nickname: string
) => {
  const trimmedNickname = nickname.trim();
  const nicknameLength = getCharLength(trimmedNickname);

  if (!trimmedNickname) {
    throw new Error('닉네임은 비어 있을 수 없습니다.');
  }

  if (nicknameLength > MAX_NICKNAME_LENGTH) {
    throw new Error(
      `닉네임은 최대 ${MAX_NICKNAME_LENGTH}자까지 입력할 수 있습니다.`
    );
  }

  const { error } = await userProfilesRepository.updateNickname(
    client,
    userId,
    trimmedNickname
  );

  if (error) {
    throw new Error(error.message);
  }

  return {
    nickname: trimmedNickname,
  };
};

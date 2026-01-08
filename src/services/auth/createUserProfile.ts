import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { generateNickname } from '@/lib/nickname/generateNickname';
import { AnimalType } from '@/commons/constants/animal/animal.enum';
import { TierType } from '@/commons/constants/tierType.enum';

/**
 * 사용자 프로필, 설정 및 상태 생성
 * @param supabase - Supabase 클라이언트 인스턴스
 * @param userId - 사용자 ID
 * @throws 프로필, 설정 또는 상태 생성 실패 시 에러
 */
export const createUserProfile = async function (
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const nickname = generateNickname();

  // 1. user_profiles 생성
  const { error: profileError } = await supabase.from('user_profiles').insert({
    id: userId,
    nickname,
    avatar_url: null,
    bio: null,
    animal_type: AnimalType.unknown,
    tier: TierType.silver,
    temperature_score: 30,
    status_message: null,
  });

  if (profileError) {
    console.error('Profile creation error:', profileError);
    throw new Error(
      profileError.message ||
        '프로필 생성에 실패했습니다. RLS 정책을 확인하세요.'
    );
  }

  // 2. user_settings 생성
  const { error: settingsError } = await supabase.from('user_settings').insert({
    id: userId,
    theme_mode: 'dark',
    notification_push: true,
    notification_chat: true,
    notification_party: true,
    language: 'ko',
  });

  if (settingsError) {
    console.error('Settings creation error:', settingsError);
    // profiles는 생성되었지만 settings 생성 실패
    throw new Error(
      settingsError.message ||
        '설정 생성에 실패했습니다. RLS 정책을 확인하세요.'
    );
  }

  // 3. user_status 생성 (회원가입 시 기본 상태를 online으로 설정)
  // 타입 정의에 user_status가 없을 수 있으므로 any로 캐스팅
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: statusError } = await (supabase as any)
    .from('user_status')
    .upsert(
      {
        user_id: userId,
        status: 'online',
      },
      {
        onConflict: 'user_id',
      }
    );

  if (statusError) {
    console.error('User status creation error:', statusError);
    // profiles와 settings는 생성되었지만 user_status 생성 실패
    throw new Error(
      statusError.message ||
        '사용자 상태 생성에 실패했습니다. RLS 정책을 확인하세요.'
    );
  }
};

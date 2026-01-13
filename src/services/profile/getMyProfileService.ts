import { getUserProfileByUserId } from './getUserProfileByUserId';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { ProfileCoreDTO } from '@/commons/types/profile/profileCore.dto';

/**
 * 내 프로필 조회 Service
 *
 * 책임:
 * - getUserProfileByUserId를 호출하여 내 프로필 조회
 * - steamStats, steamId 포함하여 완전한 프로필 데이터 반환
 *
 * 비책임:
 * - UI 분기 판단
 * - 온보딩 상태 판단
 * - 권한/인증 체크
 */
export const getMyProfileService = async (
  client: SupabaseClient<Database>,
  userId: string
): Promise<ProfileCoreDTO> => {
  // getUserProfileByUserId를 재사용하여 steamStats, steamId 포함한 완전한 프로필 반환
  return await getUserProfileByUserId(client, userId);
};

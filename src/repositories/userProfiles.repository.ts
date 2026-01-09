import { AnimalType } from '@/commons/constants/animal/animal.enum';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * user_profiles Repository
 * 책임: user_profiles 테이블 접근 전담
 */

export type UserProfileRow = {
  id: string;
  animal_type: string | null;
  avatar_url: string | null;
  nickname: string | null;
  tier: string;
  created_at: string;
  updated_at: string;
};

/**
 * user_profiles 레코드를 user_id(id)로 조회한다
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 */
export const findByUserId = async (
  client: SupabaseClient<Database>,
  userId: string
) => {
  return await client
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
};

/**
 * user_profiles 레코드를 여러 user_id(id)로 조회한다
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 */
export const findByUserIds = async (
  client: SupabaseClient<Database>,
  userIds: string[]
) => {
  return await client.from('user_profiles').select('*').in('id', userIds);
};

/**
 * user_profiles의 animal_type을 업데이트한다
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 * - Supabase 응답 구조를 그대로 반환
 */
export const updateAnimalType = async (
  client: SupabaseClient<Database>,
  userId: string,
  animalType: AnimalType
) => {
  return await client
    .from('user_profiles')
    .update({ animal_type: animalType })
    .eq('id', userId);
};

/**
 * user_profiles의 모든 user id 목록을 조회한다
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 */
export const getAllUserIds = async (
  client: SupabaseClient<Database>
): Promise<string[]> => {
  const { data, error } = await client.from('user_profiles').select('id');

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // id만 추출
  const userIds = data
    .map((row) => row.id)
    .filter((id): id is string => id !== null && id !== undefined);

  return userIds;
};

/**
 * user_traits가 있는 user_profiles의 user id 목록을 조회한다
 * - user_traits를 조회하여 성향분석 완료된 사용자만 반환
 * - Cold Start 사용자 제외
 */
export const getAllUserIdsWithTraits = async (
  client: SupabaseClient<Database>
): Promise<string[]> => {
  // user_traits를 조회하여 성향분석 완료된 사용자 ID만 반환
  const { data: traitsData, error: traitsError } = await client
    .from('user_traits')
    .select('user_id');

  if (traitsError) {
    throw traitsError;
  }

  if (!traitsData || traitsData.length === 0) {
    return [];
  }

  const userIdsWithTraits = traitsData
    .map((row) => row.user_id)
    .filter((id): id is string => id !== null && id !== undefined);

  return userIdsWithTraits;
};

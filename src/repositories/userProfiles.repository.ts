import { AnimalType } from '@/commons/constants/animal/animal.enum';
import { TierType } from '@/commons/constants/tierType.enum';
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
 * user_profiles의 temperature_score를 조회한다
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 */
export const getTemperatureScore = async (
  client: SupabaseClient<Database>,
  userId: string
): Promise<number | null> => {
  const { data, error } = await client
    .from('user_profiles')
    .select('temperature_score')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.temperature_score ?? null;
};

/**
 * user_profiles의 temperature_score를 업데이트한다 (기존 점수 + change)
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 */
export const updateTemperatureScore = async (
  client: SupabaseClient<Database>,
  userId: string,
  change: number
): Promise<void> => {
  // 현재 온도 점수 조회
  const currentScore = await getTemperatureScore(client, userId);
  if (currentScore === null) {
    throw new Error(`User profile not found for userId: ${userId}`);
  }

  // 새로운 온도 점수 계산 (기존 점수 + change)
  const newScore = Math.max(0, Math.min(100, currentScore + change));

  const { error } = await client
    .from('user_profiles')
    .update({ temperature_score: newScore })
    .eq('id', userId);

  if (error) {
    throw error;
  }
};

/**
 * user_profiles의 tier를 조회한다
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 */
export const getTier = async (
  client: SupabaseClient<Database>,
  userId: string
): Promise<TierType | null> => {
  const { data, error } = await client
    .from('user_profiles')
    .select('tier')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.tier as TierType) ?? null;
};

/**
 * user_profiles의 tier를 업데이트한다
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 */
export const updateTier = async (
  client: SupabaseClient<Database>,
  userId: string,
  newTier: TierType
): Promise<void> => {
  const { error } = await client
    .from('user_profiles')
    .update({ tier: newTier })
    .eq('id', userId);

  if (error) {
    throw error;
  }
};

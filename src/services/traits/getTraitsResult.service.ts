import { findByUserId as findUserTraits } from '@/repositories/userTraits.repository';
import { findByUserId as findUserProfile } from '@/repositories/userProfiles.repository';
import { findByUserId as findPlaySchedules } from '@/repositories/userPlaySchedules.repository';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * getTraitsResult Service
 *
 * 책임:
 * - userId를 입력으로 받는다
 * - traits/profile/schedule 조회 흐름을 orchestration 한다
 * - repository 함수들을 조합하여 결과 DTO를 구성한다
 * - 조회 실패 시 에러를 throw 한다
 */

export type TraitsResultDTO = {
  traits: {
    cooperation: number;
    exploration: number;
    strategy: number;
    leadership: number;
    social: number;
  };
  animalType: string;
  nickname: string;
  schedule: {
    dayTypes: string[];
    timeSlots: string[];
  };
  isSteamConnected: boolean;
};

export const getTraitsResult = async (
  client: SupabaseClient<Database>,
  userId: string
): Promise<TraitsResultDTO> => {
  // 1. user_traits 조회 (필수)
  const userTraitsResult = await findUserTraits(client, userId);
  if (!userTraitsResult.data) {
    throw new Error('traits not found');
  }
  const userTraits = userTraitsResult.data;

  // 2. user_profiles 조회 (animal_type, nickname, steam_id)
  const userProfileResult = await findUserProfile(client, userId);
  const animalType = userProfileResult.data?.animal_type || '';
  const nickname = userProfileResult.data?.nickname || '';
  // steam_id가 null이 아니고 빈 문자열이 아니면 스팀 연동됨
  const isSteamConnected =
    userProfileResult.data?.steam_id !== null &&
    userProfileResult.data?.steam_id !== undefined &&
    userProfileResult.data?.steam_id !== '';

  // 3. user_play_schedules 조회
  const playSchedulesResult = await findPlaySchedules(client, userId);
  const playSchedules = playSchedulesResult.data || [];

  // 4. schedule 데이터 가공 (중복 제거)
  const dayTypesSet = new Set<string>();
  const timeSlotsSet = new Set<string>();

  for (const schedule of playSchedules) {
    if (schedule.day_type) {
      dayTypesSet.add(schedule.day_type);
    }
    if (schedule.time_slot) {
      timeSlotsSet.add(schedule.time_slot);
    }
  }

  // 5. traits 객체 매핑
  const traits = {
    cooperation: userTraits.cooperation,
    exploration: userTraits.exploration,
    strategy: userTraits.strategy,
    leadership: userTraits.leadership,
    social: userTraits.social,
  };

  // 6. 최종 DTO 구성
  return {
    traits,
    animalType,
    nickname,
    schedule: {
      dayTypes: Array.from(dayTypesSet),
      timeSlots: Array.from(timeSlotsSet),
    },
    isSteamConnected,
  };
};

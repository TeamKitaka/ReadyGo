import * as userProfilesRepository from '@/repositories/userProfiles.repository';
import * as userTraitsRepository from '@/repositories/userTraits.repository';
import * as userPlaySchedulesRepository from '@/repositories/userPlaySchedules.repository';
import * as steamUserStatsRepository from '@/repositories/steamUserStats.repository';
import {
  ProfileCoreDTO,
  PlayScheduleItem,
  SteamStatsDTO,
} from '@/commons/types/profile/profileCore.dto';
import { AnimalType } from '@/commons/constants/animal/animal.enum';
import { TraitVector } from '@/commons/constants/animal/animal.vector';
import { TierType } from '@/commons/constants/tierType.enum';
import {
  ProfileNotFoundError,
  ProfileDataInconsistencyError,
  ProfileFetchError,
} from '@/commons/errors/profile/profileErrors';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * 특정 사용자의 프로필 조회 Service
 *
 * 책임:
 * - user_profiles, user_traits, user_play_schedules 데이터 조회
 * - ProfileCoreDTO로 조립
 * - 데이터 일관성 검증 (traits/schedule 불일치)
 *
 * 비책임:
 * - auth / 권한 / 관계 / 차단 로직
 * - UI 분기 판단
 * - ViewModel 변환
 * - 매칭 / 노출 정책 로직
 */
export const getUserProfileByUserId = async (
  client: SupabaseClient<Database>,
  targetUserId: string
): Promise<ProfileCoreDTO> => {
  // 1. user_profiles 조회
  const profileResult = await userProfilesRepository.findByUserId(
    client,
    targetUserId
  );

  // 1-1. Repository 에러 처리
  if (profileResult.error) {
    throw new ProfileFetchError('profile', profileResult.error.message);
  }

  // 1-2. profile이 없으면 NotFound 에러 throw (즉시 종료)
  if (!profileResult.data) {
    throw new ProfileNotFoundError(targetUserId);
  }

  const profileRow = profileResult.data;

  // 2. user_traits 조회
  const traitsResult = await userTraitsRepository.findByUserId(
    client,
    targetUserId
  );

  // 2-1. Repository 에러 처리
  if (traitsResult.error) {
    throw new ProfileFetchError('traits', traitsResult.error.message);
  }

  // 3. user_play_schedules 조회
  const schedulesResult = await userPlaySchedulesRepository.findByUserId(
    client,
    targetUserId
  );

  // 3-1. Repository 에러 처리
  if (schedulesResult.error) {
    throw new ProfileFetchError('schedules', schedulesResult.error.message);
  }

  // 4. steam_user_stats 조회 (admin 권한 사용 - RLS 우회, 상대방 프로필 조회 필요)
  const steamStatsResult = await steamUserStatsRepository.findByUserId(
    client, // client는 사용하지 않지만 호환성을 위해 전달
    targetUserId
  );
  const { data: steamStatsRow, error: steamStatsError } = steamStatsResult;

  // 4-1. Repository 에러 처리 (에러는 무시하고 null로 처리)
  if (steamStatsError) {
    console.warn(
      `[getUserProfileByUserId] Failed to fetch steam_user_stats: ${steamStatsError.message}`
    );
  }

  // 4-1. Repository 에러 처리 (에러는 무시하고 null로 처리)
  if (steamStatsError) {
    console.warn(
      `[getUserProfileByUserId] Failed to fetch steam_user_stats: ${steamStatsError.message}`
    );
  }

  const traitsRow = traitsResult.data;
  const schedulesRows = schedulesResult.data || [];

  const hasTraits = traitsRow !== null;
  const hasSchedules = schedulesRows.length > 0;

  // 4. 데이터 일관성 검증
  // traits만 존재하고 schedule이 없는 경우 → DataInconsistency 에러
  if (hasTraits && !hasSchedules) {
    throw new ProfileDataInconsistencyError(targetUserId, 'traits_only');
  }

  // schedule만 존재하고 traits가 없는 경우 → DataInconsistency 에러
  if (!hasTraits && hasSchedules) {
    throw new ProfileDataInconsistencyError(targetUserId, 'schedules_only');
  }

  // 5. 정상 케이스 처리 및 ProfileCoreDTO 조립
  let traits: TraitVector | undefined = undefined;
  let schedule: PlayScheduleItem[] | undefined = undefined;
  let steamStats: SteamStatsDTO | undefined = undefined;

  if (hasTraits && hasSchedules) {
    // 5-1. traits + schedule 모두 있는 경우 - 정상 케이스
    traits = {
      cooperation: traitsRow.cooperation,
      exploration: traitsRow.exploration,
      strategy: traitsRow.strategy,
      leadership: traitsRow.leadership,
      social: traitsRow.social,
    };

    schedule = schedulesRows.map((row) => ({
      dayType: row.day_type,
      timeSlot: row.time_slot,
    }));
  }
  // 5-2. traits + schedule 모두 없는 경우 - 정상 케이스 (undefined로 유지)

  // 5-3. steam_user_stats 조립
  if (steamStatsRow) {
    steamStats = {
      playStyle: steamStatsRow.play_style as 'casual' | 'regular' | 'hardcore',
      avgWeeklyPlaytime: steamStatsRow.avg_weekly_playtime || 0,
      mainGenres: steamStatsRow.main_genres || [],
      activeTimeSlots: steamStatsRow.active_time_slots || [],
    };
  }

  // 6. ProfileCoreDTO 반환
  // nickname, animalType 누락 허용 (기본값 자동 생성 ❌)
  // tier는 필수 필드이므로 기본값(silver) 제공
  
  // steamId 결정: 
  // 1. user_profiles의 steam_id가 있으면 사용
  // 2. 없어도 steam_user_stats에 row가 있으면 스팀 연동된 것으로 간주
  //    (steam_user_stats에 row가 있다는 것은 스팀 연동이 되어있다는 의미)
  let steamId: string | null | undefined = profileRow.steam_id ?? null;
  if (!steamId && steamStatsRow) {
    // steamStats가 있으면 스팀 연동된 것으로 간주
    // steamId를 truthy 값으로 설정 (실제 steam_id는 모르지만 연동은 되어있음)
    steamId = 'linked'; // 스팀 연동은 되어있지만 steam_id는 없는 경우를 표시
  }
  
  return {
    userId: profileRow.id,
    nickname: profileRow.nickname ?? undefined,
    tier: (profileRow.tier as TierType) ?? TierType.silver,
    animalType: profileRow.animal_type as AnimalType | null | undefined,
    traits,
    schedule,
    steamStats,
    steamId,
  };
};

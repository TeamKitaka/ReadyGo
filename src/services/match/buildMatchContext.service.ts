/**
 * ❗ Build Match Context Service
 *
 * 📌 책임 (Responsibility):
 * - viewer와 target 사용자의 매칭 계산에 필요한 입력 데이터를 조립
 * - Repository에서 raw data를 수집하여 MatchContext 구조로 변환
 * - 데이터 해석, 계산, 판단 로직 없이 순수 조립(Assembly)만 수행
 *
 * 📌 입력:
 * - viewerId: viewer 사용자 ID (UUID)
 * - targetUserId: target 사용자 ID (UUID)
 *
 * 📌 출력:
 * - MatchContextCoreDTO: 항상 유효한 Context 반환 (throw ❌)
 *
 * 📌 설계 원칙:
 * - Service Layer는 "조립(Assembly)" 책임만 가진다
 * - Domain 로직 호출 ❌
 * - 계산 / 해석 / 판단 로직 ❌
 * - Cold Start를 에러로 취급하지 않는다
 * - undefined / optional 정책을 타입과 값으로 일관되게 유지한다
 * - 단일 진입점, 단일 반환값을 유지한다
 *
 * 📌 Cold Start 처리:
 * - 데이터 없음은 정상 상태
 * - 데이터가 없으면 해당 필드를 undefined로 설정
 * - 기본값 삽입 ❌
 * - Context 부족으로 에러 발생 ❌
 *
 * 📌 Immutability:
 * - Context 생성 이후 mutation ❌
 * - 불변 객체로 반환
 */

import type {
  MatchContextCoreDTO,
  UserMatchInput,
} from '@/commons/types/match/matchContextCore.dto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { AnimalType } from '@/commons/constants/animal/animal.enum';
import type { TraitVector } from '@/commons/constants/animal/animal.vector';
import * as userProfilesRepository from '@/repositories/userProfiles.repository';
import * as userTraitsRepository from '@/repositories/userTraits.repository';
import * as userPlaySchedulesRepository from '@/repositories/userPlaySchedules.repository';
import * as steamUserStatsRepository from '@/repositories/steamUserStats.repository';

/**
 * MatchContext를 조립한다
 *
 * @param client - Supabase 클라이언트
 * @param viewerId - viewer 사용자 ID
 * @param targetUserId - target 사용자 ID
 * @returns 항상 유효한 MatchContextCoreDTO 반환
 *
 * @example
 * ```typescript
 * // 모든 데이터가 있는 경우
 * const context = await buildMatchContext(supabase, 'viewer-uuid', 'target-uuid');
 * // {
 * //   viewer: {
 * //     userId: 'viewer-uuid',
 * //     traits: { traits: {...}, animalType: 'wolf' },
 * //     activity: { schedule: [...] }
 * //   },
 * //   target: { ... }
 * // }
 *
 * // Cold Start (데이터 없음)
 * const context = await buildMatchContext(supabase, 'new-user-1', 'new-user-2');
 * // {
 * //   viewer: { userId: 'new-user-1' },
 * //   target: { userId: 'new-user-2' }
 * // }
 * ```
 */
export const buildMatchContext = async (
  client: SupabaseClient<Database>,
  viewerId: string,
  targetUserId: string
): Promise<MatchContextCoreDTO> => {
  // 1. Repository에서 viewer와 target의 raw data를 병렬로 수집
  const [
    viewerProfile,
    viewerTraits,
    viewerSchedules,
    viewerSteamStats,
    targetProfile,
    targetTraits,
    targetSchedules,
    targetSteamStats,
  ] = await Promise.all([
    userProfilesRepository.findByUserId(client, viewerId),
    userTraitsRepository.findByUserId(client, viewerId),
    userPlaySchedulesRepository.findByUserId(client, viewerId),
    steamUserStatsRepository.findByUserId(client, viewerId),
    userProfilesRepository.findByUserId(client, targetUserId),
    userTraitsRepository.findByUserId(client, targetUserId),
    userPlaySchedulesRepository.findByUserId(client, targetUserId),
    steamUserStatsRepository.findByUserId(client, targetUserId),
  ]);

  // 2. viewer의 하위 Context 조립
  const viewerTraitsContext = assembleTraitsContext(
    viewerTraits.data,
    viewerProfile.data
  );
  const viewerActivityContext = assembleActivityContext(viewerSchedules.data);
  const viewerSteamContext = assembleSteamContext(viewerSteamStats.data);

  // 3. target의 하위 Context 조립
  const targetTraitsContext = assembleTraitsContext(
    targetTraits.data,
    targetProfile.data
  );
  const targetActivityContext = assembleActivityContext(targetSchedules.data);
  const targetSteamContext = assembleSteamContext(targetSteamStats.data);

  // 4. viewer UserMatchInput 조립
  // optional 필드는 값이 없으면 필드 자체를 포함하지 않음
  const viewer: UserMatchInput = {
    userId: viewerId,
    ...(viewerTraitsContext !== undefined && { traits: viewerTraitsContext }),
    ...(viewerActivityContext !== undefined && {
      activity: viewerActivityContext,
    }),
    ...(viewerSteamContext !== undefined && { steam: viewerSteamContext }),
    // reliability는 미구현 상태이므로 필드 자체를 포함하지 않음
  };

  // 5. target UserMatchInput 조립
  // optional 필드는 값이 없으면 필드 자체를 포함하지 않음
  const target: UserMatchInput = {
    userId: targetUserId,
    ...(targetTraitsContext !== undefined && { traits: targetTraitsContext }),
    ...(targetActivityContext !== undefined && {
      activity: targetActivityContext,
    }),
    ...(targetSteamContext !== undefined && { steam: targetSteamContext }),
    // reliability는 미구현 상태이므로 필드 자체를 포함하지 않음
  };

  // 6. MatchContext 반환 (불변 객체)
  return {
    viewer,
    target,
  };
};

/**
 * Traits Context 조립 (내부 헬퍼)
 *
 * @param traitsData - user_traits 조회 결과의 data 필드
 * @param profileData - user_profiles 조회 결과의 data 필드
 * @returns TraitsContextInput 또는 undefined
 *
 * 📌 조립 규칙:
 * - traits 데이터가 없으면 → undefined 반환
 * - traits 데이터가 있으면 → TraitVector 구조로 변환
 * - animalType은 profile에서 추출 (없으면 undefined)
 * - null 값은 undefined로 변환
 * - 기본값 삽입 ❌
 * - 계산 / 점수화 ❌
 */
const assembleTraitsContext = (
  traitsData: {
    cooperation: number;
    exploration: number;
    strategy: number;
    leadership: number;
    social: number;
  } | null,
  profileData: { animal_type: string | null } | null
) => {
  // traits 데이터가 없으면 undefined 반환
  if (!traitsData) {
    return undefined;
  }

  // TraitVector 구조로 조립
  const traits: TraitVector = {
    cooperation: traitsData.cooperation,
    exploration: traitsData.exploration,
    strategy: traitsData.strategy,
    leadership: traitsData.leadership,
    social: traitsData.social,
  };

  // animalType 추출 (null이면 undefined로 변환)
  const animalType = (profileData?.animal_type ?? undefined) as
    | AnimalType
    | undefined;

  // TraitsContextInput 반환
  return {
    traits,
    animalType,
  };
};

/**
 * Activity Context 조립 (내부 헬퍼)
 *
 * @param schedulesData - user_play_schedules 조회 결과의 data 필드
 * @returns ActivityContextInput 또는 undefined
 *
 * 📌 조립 규칙:
 * - schedule 데이터가 null이면 → undefined 반환
 * - schedule 데이터가 빈 배열이면 → undefined 반환 (빈 배열 강제 ❌)
 * - schedule 데이터가 있으면 → PlayScheduleInput[] 구조로 변환
 * - isOnline은 현재 미구현 상태로 필드 자체를 포함하지 않음
 * - 기본값 강제 ❌
 * - 빈 배열 강제 ❌
 */
const assembleActivityContext = (
  schedulesData: { day_type: string; time_slot: string }[] | null
) => {
  // schedule 데이터가 null이거나 빈 배열이면 undefined 반환
  if (schedulesData === null || schedulesData.length === 0) {
    return undefined;
  }

  // schedule 데이터를 PlayScheduleInput[] 구조로 변환
  const schedule = schedulesData.map((row) => ({
    dayType: row.day_type,
    timeSlot: row.time_slot,
  }));

  // ActivityContextInput 반환
  // isOnline은 현재 미구현 상태로 필드 자체를 포함하지 않음
  return {
    schedule,
  };
};

/**
 * Steam Context 조립 (내부 헬퍼)
 *
 * @param steamStatsData - steam_user_stats 조회 결과의 data 필드
 * @returns SteamContextInput 또는 undefined
 *
 * 📌 조립 규칙:
 * - steam_user_stats 데이터가 없으면 → undefined 반환
 * - steam_user_stats 데이터가 있으면 → SteamContextInput 구조로 변환
 * - mainGenres, playStyle 추출
 * - 기본값 삽입 ❌
 */
const assembleSteamContext = (
  steamStatsData: {
    play_style: string;
    avg_weekly_playtime: number;
    main_genres: string[];
  } | null
) => {
  // steam_user_stats 데이터가 없으면 undefined 반환
  if (!steamStatsData) {
    return undefined;
  }

  // SteamContextInput 반환
  return {
    mainGenres: steamStatsData.main_genres || [],
    playStyle: steamStatsData.play_style as 'casual' | 'regular' | 'hardcore',
  };
};

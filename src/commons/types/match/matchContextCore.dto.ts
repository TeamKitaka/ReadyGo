/**
 * ❗ Match Context Core DTO
 *
 * 📌 책임 (Responsibility):
 * - viewer와 target 사용자 간 "1:1 매칭 계산"을 위한 입력 컨텍스트
 * - Match Domain 로직의 단일 입력 구조
 * - 계산 로직, 파생 필드, 유사도 점수 등은 절대 포함하지 않음
 * - 오직 "입력 사실 데이터"만 포함
 *
 * 📌 데이터 원칙:
 * - Domain Layer는 외부 상태(API, DB, UI)에 의존하지 않음
 * - Cold Start / Steam 미연동 상태에서도 null-safe하게 동작
 * - optional/required 필드를 타입 수준에서 명확히 표현
 * - viewer와 target 데이터를 구분 가능한 구조로 표현
 *
 * 📌 설계 원칙:
 * - MatchContext는 API 또는 Service 레이어에서 완성된 형태로 Domain에 전달됨
 * - Domain 내부에서는 Context를 신뢰하고 가공하지 않음
 * - UI는 MatchContext를 직접 생성하지 않음
 * - UI → API → Domain 흐름에서 Context는 Domain 진입 시점에만 사용됨
 */

import type { TraitVector } from '@/commons/constants/animal/animal.vector';
import type { AnimalType } from '@/commons/constants/animal/animal.enum';

/**
 * 플레이 시간대 입력 데이터
 *
 * user_play_schedules 테이블 기반
 * - dayType: 요일 구분 (예: 'weekday', 'weekend', 'everyday')
 * - timeSlot: 시간대 (예: '00-06', '06-12', '12-18', '18-24')
 */
export interface PlayScheduleInput {
  dayType: string;
  timeSlot: string;
}

/**
 * Traits 관련 입력 컨텍스트
 *
 * 📌 필수 필드:
 * - 없음 (모든 필드 선택)
 *
 * 📌 선택 필드:
 * - traits: 5가지 특성 벡터 (특성 검사 미완료 시 undefined)
 * - animalType: 동물 유형 (특성 검사 미완료 시 undefined)
 *
 * 📌 Cold Start 대응:
 * - Traits 미설정 상태에서도 Context 생성 가능
 * - undefined 허용
 */
export interface TraitsContextInput {
  /**
   * 5가지 특성 벡터 (플레이 스타일)
   *
   * 선택 필드
   * user_traits 테이블 기반
   *
   * - undefined: 특성 검사 미완료
   * - 값 존재: 5개 trait 모두 포함 (각 0~100 범위)
   */
  traits?: TraitVector;

  /**
   * 동물 유형 (특성 검사 결과)
   *
   * 선택 필드
   * user_profiles.animal_type 기반
   *
   * - undefined: 특성 검사 미완료
   * - 값 존재: AnimalType enum 값
   */
  animalType?: AnimalType;
}

/**
 * 활동 패턴 관련 입력 컨텍스트
 *
 * 📌 필수 필드:
 * - 없음 (모든 필드 선택)
 *
 * 📌 선택 필드:
 * - schedule: 플레이 시간대 목록 (미설정 시 undefined)
 * - isOnline: 현재 온라인 상태 (실시간 상태 미확인 시 undefined)
 *
 * 📌 Cold Start 대응:
 * - Schedule 미설정 상태에서도 Context 생성 가능
 * - undefined 허용
 */
export interface ActivityContextInput {
  /**
   * 플레이 시간대 목록
   *
   * 선택 필드
   * user_play_schedules 테이블 기반
   *
   * - undefined: 플레이 시간 미설정
   * - []: 설정했지만 빈 값
   * - [{...}]: 설정된 스케줄 존재
   */
  schedule?: PlayScheduleInput[];

  /**
   * 현재 온라인 상태
   *
   * 선택 필드
   * 실시간 presence 데이터 기반
   *
   * - undefined: 온라인 상태 미확인
   * - true: 현재 온라인
   * - false: 현재 오프라인
   */
  isOnline?: boolean;
}

/**
 * Steam 관련 입력 컨텍스트
 *
 * 📌 필수 필드:
 * - 없음 (모든 필드 선택)
 *
 * 📌 선택 필드:
 * - steamGames: Steam 게임 목록 (Steam 미연동 시 undefined)
 * - totalPlayTime: 총 플레이 시간 (Steam 미연동 시 undefined)
 * - mainGenres: 주요 장르 3개 (steam_user_stats 기반)
 * - playStyle: 플레이 스타일 (steam_user_stats 기반)
 *
 * 📌 Cold Start 대응:
 * - Steam 미연동 상태가 기본 시나리오
 * - undefined 허용
 */
export interface SteamContextInput {
  /**
   * Steam 게임 ID 목록
   *
   * 선택 필드
   * Steam API 연동 데이터 기반
   *
   * - undefined: Steam 미연동
   * - []: Steam 연동했지만 게임 없음
   * - [appId, ...]: 보유 게임 ID 목록
   */
  steamGames?: number[];

  /**
   * 총 플레이 시간 (분 단위)
   *
   * 선택 필드
   * Steam API 연동 데이터 기반
   *
   * - undefined: Steam 미연동
   * - 0: Steam 연동했지만 플레이 기록 없음
   * - 숫자: 총 플레이 시간 (분)
   */
  totalPlayTime?: number;

  /**
   * 주요 장르 목록 (상위 3개)
   *
   * 선택 필드
   * steam_user_stats.main_genres 기반
   *
   * - undefined: Steam 미연동 또는 stats 미계산
   * - []: 장르 정보 없음
   * - [genre1, genre2, genre3]: 주요 장르 목록
   */
  mainGenres?: string[];

  /**
   * 플레이 스타일
   *
   * 선택 필드
   * steam_user_stats.play_style 기반
   *
   * - undefined: Steam 미연동 또는 stats 미계산
   * - 'casual': 주당 평균 < 10시간
   * - 'regular': 주당 평균 10~30시간
   * - 'hardcore': 주당 평균 > 30시간
   */
  playStyle?: 'casual' | 'regular' | 'hardcore';
}

/**
 * 신뢰도 관련 입력 컨텍스트
 *
 * 📌 필수 필드:
 * - 없음 (모든 필드 선택)
 *
 * 📌 선택 필드:
 * - partyCount: 파티 참여 횟수
 * - reliabilityScore: 신뢰도 점수 (0~100)
 */
export interface ReliabilityContextInput {
  /**
   * 파티 참여 횟수
   *
   * 선택 필드
   * party_members 테이블 기반
   *
   * - undefined: 파티 경험 데이터 없음
   * - 0: 파티 경험 없음
   * - 숫자: 파티 참여 횟수
   */
  partyCount?: number;

  /**
   * 신뢰도 점수 (0~100)
   *
   * 선택 필드
   * 사용자 평가, 리뷰 등 기반 계산된 점수
   *
   * - undefined: 신뢰도 데이터 없음
   * - 0~100: 신뢰도 점수
   */
  reliabilityScore?: number;
}

/**
 * 단일 사용자 입력 데이터
 *
 * viewer 또는 target 사용자 한 명의 입력 데이터를 표현
 *
 * 📌 필수 필드:
 * - userId: 사용자 식별자 (계산에 사용하지 않고 식별 목적만)
 *
 * 📌 선택 필드:
 * - traits: Traits 관련 입력
 * - activity: 활동 패턴 관련 입력
 * - steam: Steam 관련 입력
 * - reliability: 신뢰도 관련 입력
 *
 * 📌 Cold Start 대응:
 * - 모든 하위 Context가 undefined여도 생성 가능
 */
export interface UserMatchInput {
  /**
   * 사용자 ID (UUID)
   *
   * 필수 필드
   * 식별 목적만 사용, 계산에는 사용하지 않음
   */
  userId: string;

  /**
   * Traits 관련 입력
   *
   * 선택 필드
   * - undefined: Traits 데이터 없음 (Cold Start)
   * - 값 존재: Traits 입력 데이터 포함
   */
  traits?: TraitsContextInput;

  /**
   * 활동 패턴 관련 입력
   *
   * 선택 필드
   * - undefined: 활동 패턴 데이터 없음 (Cold Start)
   * - 값 존재: 활동 패턴 입력 데이터 포함
   */
  activity?: ActivityContextInput;

  /**
   * Steam 관련 입력
   *
   * 선택 필드
   * - undefined: Steam 미연동 (기본 시나리오)
   * - 값 존재: Steam 입력 데이터 포함
   */
  steam?: SteamContextInput;

  /**
   * 신뢰도 관련 입력
   *
   * 선택 필드
   * - undefined: 신뢰도 데이터 없음
   * - 값 존재: 신뢰도 입력 데이터 포함
   */
  reliability?: ReliabilityContextInput;
}

/**
 * MatchContextCoreDTO
 *
 * viewer와 target 사용자 간 1:1 매칭 계산을 위한 입력 컨텍스트
 *
 * 📌 필수 필드:
 * - viewer: viewer 사용자 입력 데이터
 * - target: target 사용자 입력 데이터
 *
 * 📌 설계 원칙:
 * - 이후 모든 Match Domain 로직은 이 Context만 의존
 * - MatchContext에는 점수 계산, 유사도 계산, 파생 필드가 절대 포함되지 않음
 * - 오직 Domain 계산 함수의 "입력 사실 데이터"만 포함
 *
 * 📌 사용 예시:
 * ```typescript
 * // Steam 연동된 경우
 * const context: MatchContextCoreDTO = {
 *   viewer: {
 *     userId: 'viewer-uuid',
 *     traits: {
 *       traits: { cooperation: 58, exploration: 85, strategy: 72, leadership: 45, social: 90 },
 *       animalType: AnimalType.tiger
 *     },
 *     activity: {
 *       schedule: [{ dayType: 'weekday', timeSlot: '18-24' }],
 *       isOnline: true
 *     },
 *     steam: {
 *       steamGames: [570, 730, 440],
 *       totalPlayTime: 5000
 *     },
 *     reliability: {
 *       partyCount: 25,
 *       reliabilityScore: 85
 *     }
 *   },
 *   target: {
 *     userId: 'target-uuid',
 *     traits: {
 *       traits: { cooperation: 62, exploration: 80, strategy: 68, leadership: 50, social: 88 },
 *       animalType: AnimalType.wolf
 *     },
 *     activity: {
 *       schedule: [{ dayType: 'weekday', timeSlot: '18-24' }],
 *       isOnline: false
 *     },
 *     steam: {
 *       steamGames: [570, 730],
 *       totalPlayTime: 3000
 *     },
 *     reliability: {
 *       partyCount: 15,
 *       reliabilityScore: 78
 *     }
 *   }
 * };
 *
 * // Steam 미연동 Cold Start 경우
 * const context: MatchContextCoreDTO = {
 *   viewer: {
 *     userId: 'viewer-uuid',
 *     traits: {
 *       traits: { cooperation: 58, exploration: 85, strategy: 72, leadership: 45, social: 90 }
 *       // animalType 없음 (특성 검사 미완료)
 *     },
 *     activity: {
 *       schedule: [{ dayType: 'weekday', timeSlot: '18-24' }],
 *       isOnline: true
 *     }
 *     // steam 없음 (Steam 미연동)
 *     // reliability 없음 (신뢰도 데이터 없음)
 *   },
 *   target: {
 *     userId: 'target-uuid',
 *     traits: {
 *       traits: { cooperation: 62, exploration: 80, strategy: 68, leadership: 50, social: 88 }
 *     },
 *     activity: {
 *       schedule: [{ dayType: 'weekday', timeSlot: '18-24' }]
 *       // isOnline 없음 (온라인 상태 미확인)
 *     }
 *   }
 * };
 *
 * // 최소 입력 (모든 선택 필드 없음)
 * const context: MatchContextCoreDTO = {
 *   viewer: {
 *     userId: 'viewer-uuid'
 *     // 모든 하위 Context 없음
 *   },
 *   target: {
 *     userId: 'target-uuid'
 *     // 모든 하위 Context 없음
 *   }
 * };
 * ```
 */
export interface MatchContextCoreDTO {
  /**
   * Viewer 사용자 입력 데이터
   *
   * 필수 필드
   * 매칭을 요청한 사용자의 입력 데이터
   */
  viewer: UserMatchInput;

  /**
   * Target 사용자 입력 데이터
   *
   * 필수 필드
   * 매칭 대상 사용자의 입력 데이터
   */
  target: UserMatchInput;
}

/**
 * 📌 생성 정책 (Generation Policy):
 *
 * 1. MatchContext는 API 또는 Service 레이어에서 완성된 형태로 Domain에 전달
 * 2. Domain 내부에서는 Context를 신뢰하고 가공하지 않음
 * 3. Steam 미연동 상태를 기본 시나리오로 포함
 * 4. Traits / Schedule이 없는 상태(Cold Start)도 허용
 * 5. 필수 필드는 userId만, 나머지는 모두 선택
 * 6. undefined는 "데이터 없음"을 의미하며 null-safe하게 처리
 *
 * 📌 확장성 (Extensibility):
 *
 * 1. 이후 매칭 성공 확률, 설명 문구, 태그 계산 로직이 이 Context만으로 확장 가능
 * 2. 새로운 하위 Context 추가 시 UserMatchInput에 선택 필드로 추가
 * 3. 기존 하위 Context 내부 확장은 해당 Context 인터페이스 수정
 * 4. MatchContext는 집합 루트로 유지
 *
 * 📌 사용 가이드 (Usage Guide):
 *
 * 1. Service/Repository Layer에서 MatchContext 생성:
 * ```typescript
 * export async function buildMatchContext(
 *   viewerId: string,
 *   targetUserId: string
 * ): Promise<MatchContextCoreDTO> {
 *   const [viewerProfile, targetProfile] = await Promise.all([
 *     getProfileCore(viewerId),
 *     getProfileCore(targetUserId)
 *   ]);
 *
 *   return {
 *     viewer: {
 *       userId: viewerId,
 *       traits: viewerProfile.traits ? {
 *         traits: viewerProfile.traits,
 *         animalType: viewerProfile.animalType
 *       } : undefined,
 *       activity: {
 *         schedule: viewerProfile.schedule,
 *         isOnline: await checkOnlineStatus(viewerId)
 *       }
 *       // steam, reliability 필요 시 추가
 *     },
 *     target: {
 *       userId: targetUserId,
 *       traits: targetProfile.traits ? {
 *         traits: targetProfile.traits,
 *         animalType: targetProfile.animalType
 *       } : undefined,
 *       activity: {
 *         schedule: targetProfile.schedule,
 *         isOnline: await checkOnlineStatus(targetUserId)
 *       }
 *     }
 *   };
 * }
 * ```
 *
 * 2. Domain Layer에서 MatchContext 사용:
 * ```typescript
 * // calculateBaseSimilarity.ts
 * export function calculateBaseSimilarity(context: MatchContextCoreDTO): number {
 *   // 순수 Traits 점수만 계산
 *   const traitsScore = context.viewer.traits?.traits && context.target.traits?.traits
 *     ? calculateTraitsSimilarity(
 *         context.viewer.traits.traits,
 *         context.target.traits.traits
 *       )
 *     : undefined;
 *
 *   // Traits 없으면 Cold Start 기본값
 *   return traitsScore ?? 50;
 * }
 *
 * // calculateScheduleCompatibilityFactor.ts
 * export function calculateScheduleCompatibilityFactor(context: MatchContextCoreDTO): number {
 *   const scheduleScore = context.viewer.activity?.schedule && context.target.activity?.schedule
 *     ? calculateScheduleSimilarity(
 *         context.viewer.activity.schedule,
 *         context.target.activity.schedule
 *       )
 *     : undefined;
 *
 *   // 60점 미만이면 보정 없음
 *   if (!scheduleScore || scheduleScore < 60) return 1.0;
 *
 *   // 60~100점 → 1.0~1.05 (최대 5% 증가)
 *   const bonus = ((scheduleScore - 60) / 40) * 0.05;
 *   return 1.0 + bonus;
 * }
 *
 * // applyAnimalCompatibility.ts
 * export function applyAnimalCompatibility(
 *   baseScore: number,
 *   context: MatchContextCoreDTO
 * ): number {
 *   const viewerAnimal = context.viewer.traits?.animalType;
 *   const targetAnimal = context.target.traits?.animalType;
 *
 *   if (!viewerAnimal || !targetAnimal) return baseScore;
 *
 *   // 궁합에 따른 비율 보정
 *   const compatLevel = getCompatibilityLevel(viewerAnimal, targetAnimal);
 *   let multiplier = 1.0;
 *
 *   switch (compatLevel) {
 *     case 'best': multiplier = 1.1; break;
 *     case 'good': multiplier = 1.07; break;
 *     case 'challenging': multiplier = 0.95; break;
 *   }
 *
 *   return Math.min(100, Math.round(baseScore * multiplier));
 * }
 *
 * // calculateAvailabilityFactor.ts
 * export function calculateAvailabilityFactor(
 *   context: MatchContextCoreDTO
 * ): number {
 *   const targetOnline = context.target.activity?.isOnline ?? false;
 *   return targetOnline ? 1.0 : 0.85;
 * }
 *
 * // applySteamBonus.ts
 * export function applySteamBonus(
 *   baseScore: number,
 *   context: MatchContextCoreDTO
 * ): number {
 *   const viewerGames = context.viewer.steam?.steamGames ?? [];
 *   const targetGames = context.target.steam?.steamGames ?? [];
 *
 *   if (viewerGames.length === 0 || targetGames.length === 0) {
 *     return baseScore;
 *   }
 *
 *   const commonGames = viewerGames.filter(g => targetGames.includes(g));
 *   return baseScore + (commonGames.length * 2);
 * }
 * ```
 *
 * 3. API Layer에서 MatchContext → MatchResult 변환:
 * ```typescript
 * export async function GET(request: Request) {
 *   const { viewerId, targetUserId } = await parseRequest(request);
 *
 *   // 1. Context 생성
 *   const context = await buildMatchContext(viewerId, targetUserId);
 *
 *   // 2. Domain 계산
 *   const baseScore = calculateBaseSimilarity(context); // 순수 Traits 점수
 *   const withAnimal = applyAnimalCompatibility(baseScore, context); // 동물 궁합 보정
 *   const scheduleFactor = calculateScheduleCompatibilityFactor(context); // 시간대 팩터
 *   const availabilityFactor = calculateAvailabilityFactor(context); // 가용성 팩터
 *   const finalScore = withAnimal * scheduleFactor * availabilityFactor;
 *   const reasons = generateMatchReasons(context);
 *   const tags = generateMatchTags(context);
 *
 *   // 3. MatchResult DTO 생성
 *   const result: MatchResultCoreDTO = {
 *     userId: viewerId,
 *     targetUserId,
 *     similarityScore: Math.round(finalScore),
 *     isOnlineMatched: context.target.activity?.isOnline ?? false,
 *     reasons,
 *     tags,
 *     computedAt: new Date().toISOString()
 *   };
 *
 *   return Response.json(result);
 * }
 * ```
 */

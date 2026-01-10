/**
 * ❗ Calculate Final Match Score
 *
 * 📌 책임 (Responsibility):
 * - 모든 점수 계산 로직을 통합하는 단일 진입점
 * - MatchContext → 최종 매칭 결과(점수 + 메타 정보) 변환
 * - 점수 계산 순서와 정책을 관리
 *
 * 📌 입력:
 * - context: MatchContextCoreDTO
 *
 * 📌 출력:
 * - MatchResultDTO: 최종 매칭 점수 + 메타 정보
 *
 * 📌 계산 순서:
 * 1. 순수 성향 점수 계산 (Traits) - Base Similarity
 * 2. 동물 궁합 팩터 적용 (multiplicative)
 * 3. 시간대 호환성 팩터 적용 (multiplicative)
 * 4. 온라인 팩터 적용 (multiplicative)
 * 5. 최종 점수 반올림 및 범위 제한 (0~100)
 * 6. 메타 정보 생성 (isOnlineMatched, availabilityHint)
 *
 * 📌 설계 원칙:
 * - 각 계산 단계는 독립적인 함수로 분리
 * - 모든 보정은 multiplicative factor로만 적용
 * - 중간 결과는 외부에 노출하지 않음
 * - 확장 가능한 구조
 *
 * 📌 Factor Policy Summary:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 🎯 핵심 원칙: baseScore는 절대 감소하지 않음 (multiplicative only)      │
 * │ - 모든 보정은 multiplicative factor (곱셈)로만 적용                     │
 * │ - additive 방식 (덧셈/뺄셈) 절대 사용 금지                              │
 * │ - 각 factor는 독립적으로 계산 (서로 의존하지 않음)                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * 📊 Base Score (중심 점수):
 * - 범위: 0~100
 * - 계산: Traits 코사인 유사도 (순수 성향 일치도)
 * - Cold Start: 50점 (Traits 미설정 시)
 * - 특징: 이후 단계에서 절대 직접 수정되지 않음
 *
 * 🦁 Animal Compatibility Factor (동물 궁합 팩터):
 * - 범위: 0.95 ~ 1.10
 * - 역할: 동물 유형 간 궁합에 따른 보정
 * - 정책:
 *   • 천생연분 (best): 1.10 (10% 증가)
 *   • 좋은 궁합 (good): 1.07 (7% 증가)
 *   • 동일한 동물: 1.05 (5% 증가)
 *   • 중립 (neutral): 1.0 (보정 없음)
 *   • 도전적인 궁합 (challenging): 0.95 (5% 감소)
 *   • 동물 타입 미설정: 1.0 (보정 없음)
 * - 영향: 성향 일치도에 대한 동물 궁합 가중치
 *
 * ⏰ Schedule Compatibility Factor (시간대 호환성 팩터):
 * - 범위: 1.0 ~ 1.05
 * - 역할: 플레이 시간대 겹침 정도에 따른 보정
 * - 정책:
 *   • scheduleScore < 60: 1.0 (의미 없는 겹침, 보정 없음)
 *   • scheduleScore = 60: 1.0 (임계값)
 *   • scheduleScore = 80: 1.025 (2.5% 증가)
 *   • scheduleScore = 100: 1.05 (5% 증가, 최대)
 *   • Schedule 미설정: 1.0 (보정 없음)
 * - 영향: 함께 플레이할 가능성에 대한 약한 가중치
 *
 * 🌐 Online Factor (온라인 상태 팩터):
 * - 범위: 1.0 ~ 1.02
 * - 역할: 현재 온라인 상태에 따른 약한 우선권
 * - 정책:
 *   • 온라인 (isOnline = true): 1.02 (2% 증가)
 *   • 오프라인 (isOnline = false): 1.0 (보정 없음)
 *   • 상태 미확인 (isOnline = undefined): 1.0 (보정 없음)
 * - 영향: 즉시 매칭 가능성에 대한 최소한의 가중치
 * - 특징: 온라인 상태는 메타 정보로도 분리 제공 (isOnlineMatched, availabilityHint)
 *
 * 🎮 Steam Compatibility Factor (Steam 호환성 팩터):
 * - 범위: 1.0 ~ 1.10
 * - 역할: 공통 게임 수에 따른 보정
 * - 정책:
 *   • 공통 게임 0개: 1.0 (보정 없음)
 *   • 공통 게임 1개: 1.02 (2% 증가)
 *   • 공통 게임 2개: 1.04 (4% 증가)
 *   • 공통 게임 3개: 1.06 (6% 증가)
 *   • 공통 게임 4개: 1.08 (8% 증가)
 *   • 공통 게임 5개 이상: 1.10 (10% 증가, 최대)
 *   • Steam 미연동: 1.0 (보정 없음)
 * - 영향: 공통 관심사에 대한 가중치
 * - 특징: 현재는 calculateFinalMatchScore에 통합되지 않음 (필요시 추가)
 *
 * 🧮 최종 점수 계산 공식:
 * ```
 * finalScore = Math.round(
 *   baseScore × animalFactor × scheduleFactor × onlineFactor
 * )
 * finalScore = Math.min(100, Math.max(0, finalScore))
 * ```
 *
 * 📊 계산 예시:
 * - 예시 1 (완벽한 매칭):
 *   baseScore = 95 (높은 성향 일치)
 *   × animalFactor = 1.10 (천생연분)
 *   × scheduleFactor = 1.05 (완벽한 시간대)
 *   × onlineFactor = 1.02 (온라인)
 *   = 111.6 → 100 (clamp)
 *
 * - 예시 2 (성향만 잘 맞음):
 *   baseScore = 85 (좋은 성향 일치)
 *   × animalFactor = 1.0 (동물 타입 없음)
 *   × scheduleFactor = 1.0 (시간대 정보 없음)
 *   × onlineFactor = 1.0 (오프라인)
 *   = 85
 *
 * - 예시 3 (Cold Start):
 *   baseScore = 50 (기본값)
 *   × animalFactor = 1.0 (동물 타입 없음)
 *   × scheduleFactor = 1.0 (시간대 정보 없음)
 *   × onlineFactor = 1.0 (오프라인)
 *   = 50
 *
 * 🎯 설계 의도:
 * - 성향 일치도(baseScore)가 가장 중요한 요소
 * - 동물 궁합, 시간대, 온라인 상태는 보조적 역할
 * - 성향이 잘 맞는 오프라인 사용자 > 성향이 덜 맞는 온라인 사용자
 * - 모든 factor는 독립적이므로 확장 용이
 */

import type { MatchContextCoreDTO } from '@/commons/types/match/matchContextCore.dto';
import type { MatchResultDTO } from '@/commons/types/match/matchResult.dto';
import { calculateBaseSimilarity } from './calculateBaseSimilarity';
import { calculateAnimalCompatibilityFactor } from './applyAnimalCompatibility';
import { calculateScheduleCompatibilityFactor } from './calculateScheduleCompatibilityFactor';
import { calculateOnlineFactor } from './calculateAvailabilityFactor';
import { calculateSteamCompatibilityFactor } from './applySteamBonus';

/**
 * 최종 매칭 점수 계산 (단일 진입점)
 *
 * @param context - MatchContext 입력
 * @returns 최종 매칭 결과 (점수 + 메타 정보)
 *
 * @example
 * ```typescript
 * // 모든 요소가 잘 맞는 경우
 * const context: MatchContextCoreDTO = {
 *   viewer: {
 *     userId: 'viewer-uuid',
 *     traits: {
 *       animalType: AnimalType.tiger,
 *       traits: { cooperation: 85, exploration: 80, strategy: 75, leadership: 70, social: 90 }
 *     },
 *     activity: {
 *       isOnline: true,
 *       schedule: [
 *         { dayType: 'weekday', timeSlot: '18-24' },
 *         { dayType: 'weekend', timeSlot: '12-18' }
 *       ]
 *     }
 *   },
 *   target: {
 *     userId: 'target-uuid',
 *     traits: {
 *       animalType: AnimalType.bear,
 *       traits: { cooperation: 80, exploration: 85, strategy: 70, leadership: 75, social: 88 }
 *     },
 *     activity: {
 *       isOnline: true,
 *       schedule: [
 *         { dayType: 'weekday', timeSlot: '18-24' },
 *         { dayType: 'weekend', timeSlot: '12-18' }
 *       ]
 *     }
 *   }
 * };
 *
 * const result = calculateFinalMatchScore(context);
 * // {
 * //   finalScore: 100,
 * //   isOnlineMatched: true,
 * //   availabilityHint: 'online'
 * // }
 * //
 * // 계산 과정:
 * // 1. baseScore = 95 (Traits 유사도)
 * // 2. animalFactor = 1.10 (천생연분)
 * // 3. scheduleFactor = 1.05 (완벽한 시간대)
 * // 4. onlineFactor = 1.02 (온라인)
 * // 5. finalScore = 95 × 1.10 × 1.05 × 1.02 = 111.6 → 100 (clamp)
 * ```
 *
 * @example
 * ```typescript
 * // 성향만 잘 맞고 시간대/온라인 상태 불일치
 * const context: MatchContextCoreDTO = {
 *   viewer: {
 *     userId: 'viewer-uuid',
 *     traits: {
 *       traits: { cooperation: 85, exploration: 80, strategy: 75, leadership: 70, social: 90 }
 *     },
 *     activity: {
 *       schedule: [{ dayType: 'weekday', timeSlot: '18-24' }]
 *     }
 *   },
 *   target: {
 *     userId: 'target-uuid',
 *     traits: {
 *       traits: { cooperation: 80, exploration: 85, strategy: 70, leadership: 75, social: 88 }
 *     },
 *     activity: {
 *       isOnline: false,
 *       schedule: [{ dayType: 'weekend', timeSlot: '06-12' }]
 *     }
 *   }
 * };
 *
 * const result = calculateFinalMatchScore(context);
 * // {
 * //   finalScore: 95,
 * //   isOnlineMatched: false,
 * //   availabilityHint: 'offline'
 * // }
 * //
 * // 계산 과정:
 * // 1. baseScore = 95 (Traits 유사도)
 * // 2. animalFactor = 1.0 (동물 타입 없음)
 * // 3. scheduleFactor = 1.0 (의미 없는 겹침)
 * // 4. onlineFactor = 1.0 (오프라인)
 * // 5. finalScore = 95 × 1.0 × 1.0 × 1.0 = 95
 * ```
 *
 * @example
 * ```typescript
 * // Cold Start (최소 정보)
 * const context: MatchContextCoreDTO = {
 *   viewer: { userId: 'viewer-uuid' },
 *   target: { userId: 'target-uuid' }
 * };
 *
 * const result = calculateFinalMatchScore(context);
 * // {
 * //   finalScore: 50,
 * //   isOnlineMatched: false,
 * //   availabilityHint: 'unknown'
 * // }
 * //
 * // 계산 과정:
 * // 1. baseScore = 50 (Cold Start 기본값)
 * // 2. animalFactor = 1.0 (동물 타입 없음)
 * // 3. scheduleFactor = 1.0 (Schedule 없음)
 * // 4. onlineFactor = 1.0 (오프라인 간주)
 * // 5. finalScore = 50 × 1.0 × 1.0 × 1.0 = 50
 * ```
 */
export const calculateFinalMatchScore = (
  context: MatchContextCoreDTO
): MatchResultDTO => {
  // 1. 순수 성향 점수 (Traits) - Base Similarity
  const baseScore = calculateBaseSimilarity(context);

  // 2. 동물 궁합 팩터 (multiplicative)
  const animalFactor = calculateAnimalCompatibilityFactor(context);

  // 3. 시간대 호환성 팩터 (multiplicative)
  const scheduleFactor = calculateScheduleCompatibilityFactor(context);

  // 4. 온라인 팩터 (multiplicative)
  const onlineFactor = calculateOnlineFactor(context);

  // 5. Steam 호환성 팩터 (multiplicative) - 항상 마지막에 적용
  const steamFactor = calculateSteamCompatibilityFactor(context);

  // 6. 최종 점수 계산 (모든 팩터를 곱셈으로 적용)
  // ⚠️ 중요: Steam Factor는 항상 마지막에 곱함
  // - Steam이 "좋은 관계를 더 좋게" 만드는 역할
  // - Steam만 비슷한데 성향 안 맞는 케이스 방지
  // - 성향(baseScore)이 가장 중요한 요소로 유지
  const rawScore =
    baseScore * animalFactor * scheduleFactor * onlineFactor * steamFactor;

  // 7. 반올림 및 범위 제한 (0~95)
  // 최대 95%로 제한하여 "완벽한 매칭"의 비현실성 방지
  const finalScore = Math.min(95, Math.max(0, Math.round(rawScore)));

  // 7. 메타 정보 생성
  const targetOnline = context.target.activity?.isOnline;
  const isOnlineMatched = targetOnline === true;
  const availabilityHint: 'online' | 'offline' | 'unknown' =
    targetOnline === true
      ? 'online'
      : targetOnline === false
        ? 'offline'
        : 'unknown';

  // 8. 결과 반환
  return {
    finalScore,
    isOnlineMatched,
    availabilityHint,
  };
};

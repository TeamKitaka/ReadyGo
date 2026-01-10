/**
 * ❗ Match Reason Core DTO
 *
 * 📌 책임 (Responsibility):
 * - 매칭 이유를 설명하는 구조화된 데이터 제공
 * - UI 문구 조합에 필요한 최소 정보만 포함
 * - 자연어 문장, 설명 텍스트는 포함하지 않음
 * - Steam 데이터 유무에 의존하지 않음
 *
 * 📌 데이터 원칙:
 * - key-value 기반의 구조화된 데이터
 * - 계산 과정, 가중치, 수식은 절대 포함하지 않음
 * - 결과 값만 포함
 * - 최소 3개 이상 항상 생성 가능하도록 설계
 */

import type { TraitKey } from '@/features/match/domain/utils/traitsSimilarity';

/**
 * 매칭 이유 타입
 *
 * - COMMON_GAME: 공통 게임 보유
 * - PLAY_TIME: 플레이 시간 유사성
 * - STEAM_GENRE: Steam 장르 유사성
 * - STEAM_PLAYSTYLE: Steam 플레이 스타일 호환성
 * - STYLE_SIMILARITY: 플레이 스타일 유사성 (Traits 기반)
 * - PARTY_EXPERIENCE: 파티 경험 유사성
 * - RELIABILITY: 신뢰도 점수
 * - ONLINE_NOW: 현재 온라인 상태
 * - ACTIVITY_PATTERN: 활동 패턴 유사성 (플레이 시간대 기반)
 */
export type MatchReasonType =
  | 'COMMON_GAME'
  | 'PLAY_TIME'
  | 'STEAM_GENRE'
  | 'STEAM_PLAYSTYLE'
  | 'STYLE_SIMILARITY'
  | 'PARTY_EXPERIENCE'
  | 'RELIABILITY'
  | 'ONLINE_NOW'
  | 'ACTIVITY_PATTERN';

/**
 * Reason 우선순위
 *
 * - HIGH: 매칭 결정에 매우 중요한 이유 (공통 게임, 스타일 유사도 등)
 * - MEDIUM: 매칭에 도움이 되는 이유 (온라인 상태, 신뢰도 등)
 * - LOW: 부가적인 이유 (파티 경험 등)
 */
export type ReasonPriority = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Reason 상세 데이터 타입
 *
 * 각 Reason 타입별로 필요한 최소 데이터만 포함
 */
export type MatchReasonDetail =
  | {
      type: 'COMMON_GAME';
      /**
       * 공통 게임 수
       * Steam 미연동 시: 0
       */
      gameCount: number;
      /**
       * 대표 게임 이름 (최대 2개)
       * Steam 미연동 시: []
       */
      topGames: string[];
    }
  | {
      type: 'PLAY_TIME';
      /**
       * 플레이 시간 일치도 (0~100)
       * 플레이 시간대(schedule) 기반 계산 결과
       */
      matchScore: number;
    }
  | {
      type: 'STEAM_GENRE';
      /**
       * 공통 장르 이름
       */
      genre: string;
      /**
       * 장르 유사도 (0~100)
       */
      similarity: number;
    }
  | {
      type: 'STEAM_PLAYSTYLE';
      /**
       * Viewer의 플레이 스타일
       */
      viewerStyle: string;
      /**
       * Target의 플레이 스타일
       */
      targetStyle: string;
    }
  | {
      type: 'STYLE_SIMILARITY';
      /**
       * 스타일 유사도 (0~100)
       * Traits 기반 계산 결과
       */
      similarityScore: number;
      /**
       * 가장 유사한 Trait 키
       *
       * 타입 안전: TraitKey (keyof TraitVector)
       * 예: 'cooperation', 'exploration', 'strategy', 'leadership', 'social'
       *
       * ViewModel에서 타입 안전하게 label 매핑 가능:
       * ```typescript
       * const traitLabels: Record<TraitKey, string> = {
       *   cooperation: '협동',
       *   exploration: '탐험',
       *   strategy: '전략',
       *   leadership: '리더십',
       *   social: '사교성'
       * };
       * const label = traitLabels[reason.detail.topTrait]; // 타입 에러 없음
       * ```
       */
      topTrait: TraitKey;
    }
  | {
      type: 'PARTY_EXPERIENCE';
      /**
       * 파티 경험 유사도 (0~100)
       */
      experienceScore: number;
    }
  | {
      type: 'RELIABILITY';
      /**
       * 신뢰도 점수 (0~100)
       */
      reliabilityScore: number;
    }
  | {
      type: 'ONLINE_NOW';
      /**
       * 현재 온라인 여부
       */
      isOnline: boolean;
    }
  | {
      type: 'ACTIVITY_PATTERN';
      /**
       * 활동 패턴 일치도 (0~100)
       */
      patternScore: number;
      /**
       * 공통 활동 시간대 (원시 데이터)
       * UI에서 '주중 저녁', '주말 오후' 등으로 변환
       */
      commonTimeSlots: Array<{
        dayType: string;
        timeSlot: string;
      }>;
      /**
       * Viewer의 시간대 타입
       * UI에서 관계 기반 메시지 생성에 사용
       */
      viewerTimeType?:
        | 'morning'
        | 'afternoon'
        | 'evening'
        | 'lateNight'
        | 'flexible'
        | 'weekend';
      /**
       * Target의 시간대 타입
       * UI에서 관계 기반 메시지 생성에 사용
       */
      targetTimeType?:
        | 'morning'
        | 'afternoon'
        | 'evening'
        | 'lateNight'
        | 'flexible'
        | 'weekend';
    };

/**
 * MatchReasonCoreDTO
 *
 * 매칭 이유 하나를 표현하는 Core DTO
 *
 * 📌 필수 필드:
 * - detail: 구조화된 데이터 (type별로 다른 구조)
 * - priority: 이유의 중요도 (HIGH, MEDIUM, LOW)
 *
 * 📌 선택 필드:
 * - isBaseline: fallback 기본값 여부 (데이터 부족 시 생성된 reason)
 *
 * 📌 사용 예시:
 * ```typescript
 * // Steam 연동된 경우
 * const reason1: MatchReasonCoreDTO = {
 *   detail: {
 *     type: 'COMMON_GAME',
 *     gameCount: 5,
 *     topGames: ['Dota 2', 'Counter-Strike 2']
 *   },
 *   priority: 'HIGH'
 * };
 *
 * // Steam 미연동 Cold Start 경우
 * const reason2: MatchReasonCoreDTO = {
 *   detail: {
 *     type: 'STYLE_SIMILARITY',
 *     similarityScore: 82,
 *     topTrait: 'cooperation'
 *   },
 *   priority: 'HIGH'
 * };
 *
 * const reason3: MatchReasonCoreDTO = {
 *   detail: {
 *     type: 'ACTIVITY_PATTERN',
 *     patternScore: 75,
 *     commonTimeSlots: [
 *       { dayType: 'weekday', timeSlot: '18-24' },
 *       { dayType: 'weekend', timeSlot: '12-18' }
 *     ]
 *   },
 *   priority: 'MEDIUM'
 * };
 *
 * // Fallback baseline reason
 * const reason4: MatchReasonCoreDTO = {
 *   detail: {
 *     type: 'RELIABILITY',
 *     reliabilityScore: 50
 *   },
 *   priority: 'LOW',
 *   isBaseline: true
 * };
 * ```
 */
export interface MatchReasonCoreDTO {
  /**
   * 이유 상세 데이터
   *
   * type에 따라 구조가 달라지는 구조화된 데이터
   * UI에서 문구 조합에 필요한 최소 정보만 포함
   */
  detail: MatchReasonDetail;

  /**
   * 이유의 중요도
   *
   * 필수 필드
   * - HIGH: 매칭 결정에 매우 중요한 이유
   * - MEDIUM: 매칭에 도움이 되는 이유
   * - LOW: 부가적인 이유
   *
   * ViewModel에서 우선순위 정렬 또는 필터링에 사용
   */
  priority: ReasonPriority;

  /**
   * Baseline (fallback) reason 여부
   *
   * 선택 필드
   * - true: 데이터 부족으로 기본값으로 생성된 reason
   * - false/undefined: 실제 데이터 기반 reason
   *
   * UI에서 baseline reason은 스타일 처리 또는 숨김 처리 가능
   */
  isBaseline?: boolean;
}

/**
 * 📌 생성 정책 (Generation Policy):
 *
 * 1. 최소 3개 이상 항상 생성 가능
 * 2. Steam 미연동 Cold Start 시나리오:
 *    - STYLE_SIMILARITY (Traits 기반)
 *    - ACTIVITY_PATTERN (플레이 시간대 기반)
 *    - RELIABILITY (사용자 신뢰도 기반)
 *    - ONLINE_NOW (현재 접속 상태)
 *
 * 3. Steam 연동 시나리오:
 *    - COMMON_GAME (공통 게임 기반)
 *    - PLAY_TIME (게임 플레이 시간 기반)
 *    - 위의 Cold Start Reason들도 함께 생성 가능
 *
 * 4. "데이터 부족" 같은 표현 노출 금지
 * 5. Reason은 "데이터 존재 여부"가 아니라 "비교 가능성"이 있으면 생성
 */

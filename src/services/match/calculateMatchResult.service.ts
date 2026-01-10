/**
 * ❗ Calculate Match Result Service
 *
 * 📌 책임 (Responsibility):
 * - viewer와 target 사용자 간의 매칭 결과 계산 오케스트레이션
 * - Context 조립 Service와 Domain 계산 로직 사이의 조율
 * - 순수하게 조립과 호출만 수행, 계산/판단/해석 로직 없음
 *
 * 📌 입력:
 * - client: Supabase 클라이언트
 * - viewerId: viewer 사용자 ID (UUID)
 * - targetUserId: target 사용자 ID (UUID)
 *
 * 📌 출력:
 * - Promise<MatchResultDTO>: 항상 유효한 매칭 결과 반환 (throw ❌)
 *
 * 📌 설계 원칙:
 * - Service Layer는 "오케스트레이션(Orchestration)" 책임만 가진다
 * - Domain 로직 직접 구현 금지
 * - 계산 정책 / 점수 공식 / factor 정의 금지
 * - Context 조립은 전용 Service에 위임
 * - 단일 public 함수만 export
 * - throw / null 반환 금지
 * - Cold Start 포함 모든 경우에서 결과 DTO 반환
 * - 객체 mutation 금지 (immutability 유지)
 *
 * 📌 처리 흐름:
 * 1. buildMatchContext를 통해 MatchContext 생성
 * 2. Domain의 calculateFinalMatchScore 단일 진입점 호출
 * 3. Domain 반환값을 그대로 신뢰하여 반환
 *
 * 📌 금지 사항:
 * - Context를 직접 조립하거나 수정하지 말 것
 * - Domain 내부 factor / sub-function 직접 호출 금지
 * - Domain 반환값을 재해석하지 말 것
 * - UI 문구 / 퍼센트 / 게이지 / 태그 가공 금지
 * - Object.assign, push, mutation 사용 금지
 * - Hook 또는 UI 로직 호출 금지
 * - 상태 관리 / 캐싱 / 재시도 로직 금지
 * - ViewModel 변환 금지
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { MatchResultDTO } from '@/commons/types/match/matchResult.dto';
import type { MatchReasonCoreDTO } from '@/commons/types/match/matchReasonCore.dto';
import type { MatchTagCoreDTO } from '@/commons/types/match/matchTagCore.dto';
import { buildMatchContext } from './buildMatchContext.service';
import { calculateFinalMatchScore } from '@/features/match/domain/score/calculateFinalMatchScore';
import {
  generateMatchReasons,
  generateMatchTags,
} from '@/features/match/domain/explanation';

/**
 * 매칭 결과를 계산한다
 *
 * @param client - Supabase 클라이언트
 * @param viewerId - viewer 사용자 ID
 * @param targetUserId - target 사용자 ID
 * @returns 항상 유효한 MatchResultDTO 반환
 *
 * @example
 * ```typescript
 * // 정상 케이스 (모든 데이터가 있는 경우)
 * const result = await calculateMatchResult(supabase, 'viewer-uuid', 'target-uuid');
 * // {
 * //   finalScore: 87,
 * //   isOnlineMatched: true,
 * //   availabilityHint: 'online'
 * // }
 *
 * // Cold Start (데이터 없음)
 * const result = await calculateMatchResult(supabase, 'new-user-1', 'new-user-2');
 * // {
 * //   finalScore: 50,
 * //   isOnlineMatched: false,
 * //   availabilityHint: 'unknown'
 * // }
 * ```
 */
export const calculateMatchResult = async (
  client: SupabaseClient<Database>,
  viewerId: string,
  targetUserId: string
): Promise<
  MatchResultDTO & { reasons: MatchReasonCoreDTO[]; tags: MatchTagCoreDTO[] }
> => {
  // 1. Context 조립 (전용 Service에 위임)
  const context = await buildMatchContext(client, viewerId, targetUserId);

  // 2. Domain 계산 (3개 함수 호출)
  const result = calculateFinalMatchScore(context);
  const reasons = generateMatchReasons(context); // Domain이 만든 그대로
  const tags = generateMatchTags(context); // Domain이 만든 그대로

  // 3. 통합 반환 (가공 ❌)
  return {
    ...result,
    reasons,
    tags,
  };
};

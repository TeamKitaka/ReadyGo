/**
 * ❗ Get Party Member Count Service
 *
 * 📌 책임 (Responsibility):
 * - 특정 사용자의 파티 참여 개수 조회
 * - Repository 호출 오케스트레이션
 * - 에러 처리 및 fallback 제공
 *
 * 📌 입력:
 * - userId: 사용자 ID (UUID)
 *
 * 📌 출력:
 * - Promise<number>: 파티 참여 개수 (항상 0 이상)
 *
 * 📌 설계 원칙:
 * - Service Layer는 "오케스트레이션(Orchestration)" 책임만 가진다
 * - Repository에 데이터 접근 위임
 * - throw / null 반환 금지
 * - Cold Start 포함 모든 경우에서 number 반환
 * - 객체 mutation 금지 (immutability 유지)
 *
 * 📌 처리 흐름:
 * 1. Repository 함수 호출
 * 2. 결과 반환 (에러 시 0 반환)
 *
 * 📌 사용처:
 * - Domain: generateMatchTags (파티 관련 태그 생성 시)
 * - Domain: generateMatchReasons (파티 경험 이유 생성 시)
 * - Context: buildMatchContext (MatchContext 조립 시)
 */

import { getPartyMemberCountByUserId } from '@/repositories/partyMembers.repository';

/**
 * 특정 사용자의 파티 참여 개수를 조회한다
 *
 * @param userId - 사용자 ID (UUID)
 * @returns 항상 유효한 number 반환 (0 이상)
 *
 * @example
 * ```typescript
 * // 정상 케이스
 * const count = await getPartyMemberCount('user-uuid');
 * // 25
 *
 * // Cold Start (신규 유저)
 * const count = await getPartyMemberCount('new-user-uuid');
 * // 0
 *
 * // 에러 케이스 (네트워크 오류 등)
 * const count = await getPartyMemberCount('invalid-uuid');
 * // 0 (fallback)
 * ```
 */
export const getPartyMemberCount = async (userId: string): Promise<number> => {
  // 입력 검증
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    console.warn('[GetPartyMemberCountService] Invalid userId:', userId);
    return 0;
  }

  // Repository 호출
  const count = await getPartyMemberCountByUserId(userId);

  // 결과 반환 (항상 0 이상)
  return Math.max(0, count);
};


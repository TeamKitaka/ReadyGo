import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import * as userProfilesRepository from '@/repositories/userProfiles.repository';
import * as friendshipRepository from '@/repositories/friendship.repository';
import * as userBlocksRepository from '@/repositories/userBlocks.repository';
import * as chatRepository from '@/repositories/chat.repository';

/**
 * 매칭 후보 타입
 */
export interface MatchCandidate {
  userId: string;
}

/**
 * 매칭 후보 조회 Service
 *
 * 책임:
 * - 후보 pool 조회 (Repository 위임)
 * - 구조적 제외 규칙 적용
 *   - 자기 자신 제외
 *   - 차단 관계 제외 (양방향)
 *   - 친구 관계 제외
 *   - 1:1 채팅방 존재하는 사용자 제외
 *
 * 비책임:
 * - Domain 로직 호출
 * - 점수 계산 / 의미 해석 / 정책 판단
 * - MatchContext 생성
 * - 매칭 점수 / 성향 / Online / Steam 관련 판단
 */
export const getMatchCandidates = async (
  client: SupabaseClient<Database>,
  viewerId: string
): Promise<MatchCandidate[]> => {
  // 1. 후보 pool 조회 (Repository 책임)
  // 성향분석 완료된 사용자만 조회 (Cold Start 제외)
  // TODO: 서비스 확장 시 pre-filter 필요 (예: 지역, 티어, 최근 활동 등)
  //       - Repository 레벨에서 WHERE 조건 추가
  //       - 또는 별도 getCandidatePoolWithFilter 함수 생성
  const candidatePool =
    await userProfilesRepository.getAllUserIdsWithTraits(client);

  if (candidatePool.length === 0) {
    return [];
  }

  // 2. 제외 대상 조회 (병렬 처리로 성능 최적화)
  const [blockedUserIds, friendUserIds, chatUserIds] = await Promise.all([
    userBlocksRepository.getBlockedUserIds(client, viewerId),
    friendshipRepository.getFriendUserIds(client, viewerId),
    chatRepository.getChatUserIds(client, viewerId),
  ]);

  // 3. 제외 대상을 Set으로 변환 (O(1) 조회)
  const excludeSet = new Set<string>([
    viewerId, // 자기 자신
    ...blockedUserIds, // 차단 관계 (양방향)
    ...friendUserIds, // 친구 관계
    ...chatUserIds, // 1:1 채팅방 존재
  ]);

  // 4. 제외 규칙 적용
  const filteredCandidates = candidatePool.filter(
    (userId) => !excludeSet.has(userId)
  );

  // 5. MatchCandidate 타입으로 변환
  const result: MatchCandidate[] = filteredCandidates.map((userId) => ({
    userId,
  }));

  return result;
};

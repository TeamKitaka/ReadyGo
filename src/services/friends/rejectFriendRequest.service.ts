import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import * as friendRequestsRepository from '@/repositories/friendRequests.repository';

/**
 * 친구 요청 거절 서비스
 *
 * 📌 책임:
 * - 친구 요청 거절 처리
 * - 요청 상태 업데이트만 수행
 * - friendships 생성하지 않음
 *
 * 📌 핵심 원칙:
 * - receiver만 거절 가능 (보안 검증)
 * - pending 상태만 거절 가능
 */

export interface RejectFriendRequestParams {
  requestId: number;
  currentUserId: string;
}

/**
 * 친구 요청을 거절한다
 *
 * @param client - Supabase 클라이언트
 * @param params - 거절 파라미터
 * @throws Error - 요청이 없거나, 이미 처리되었거나, 권한이 없는 경우
 */
export const rejectFriendRequest = async (
  client: SupabaseClient<Database>,
  params: RejectFriendRequestParams
): Promise<void> => {
  const { requestId, currentUserId } = params;

  // 1. friend_requests 조회
  const request = await friendRequestsRepository.findById(client, requestId);

  if (!request) {
    throw new Error('Friend request not found');
  }

  // 2. 검증: pending 상태인지 확인
  if (request.status !== 'pending') {
    throw new Error('Friend request has already been processed');
  }

  // 3. 검증: receiver만 거절 가능
  if (request.receiver_id !== currentUserId) {
    throw new Error('Unauthorized: Only the receiver can reject the request');
  }

  // 4. 상태만 업데이트 (friendships 생성하지 않음)
  await friendRequestsRepository.updateStatus(client, requestId, 'rejected');
};

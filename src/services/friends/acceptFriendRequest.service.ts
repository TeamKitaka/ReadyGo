import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import * as friendRequestsRepository from '@/repositories/friendRequests.repository';
import * as friendshipRepository from '@/repositories/friendship.repository';
import { createFriendAcceptedNotification } from '@/services/notifications/createFriendAcceptedNotification.service';

/**
 * 친구 요청 수락 서비스
 *
 * 📌 책임:
 * - 친구 요청 수락 처리
 * - 양방향 친구 관계 생성
 * - 요청 상태 업데이트
 * - 수락 알림 생성
 *
 * 📌 핵심 원칙:
 * - 이 Service가 "친구가 되는 유일한 경로"
 * - receiver만 수락 가능 (보안 검증)
 * - pending 상태만 수락 가능
 */

export interface AcceptFriendRequestParams {
  requestId: number;
  currentUserId: string;
}

/**
 * 친구 요청을 수락한다
 *
 * @param client - Supabase 클라이언트
 * @param params - 수락 파라미터
 * @throws Error - 요청이 없거나, 이미 처리되었거나, 권한이 없는 경우
 */
export const acceptFriendRequest = async (
  client: SupabaseClient<Database>,
  params: AcceptFriendRequestParams
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

  // 3. 검증: receiver만 수락 가능
  if (request.receiver_id !== currentUserId) {
    throw new Error('Unauthorized: Only the receiver can accept the request');
  }

  // 3-1. sender_id와 receiver_id 검증
  if (!request.sender_id || !request.receiver_id) {
    throw new Error('Invalid friend request: missing sender or receiver');
  }

  // 3-2. 이미 친구인지 확인 (중복 방지)
  const isAlreadyFriend = await friendshipRepository.exists(
    client,
    request.sender_id,
    request.receiver_id
  );
  if (isAlreadyFriend) {
    throw new Error('Already friends');
  }

  // 4. 친구 관계 생성 (양방향 2 rows)
  try {
    await friendshipRepository.createPair(
      client,
      request.sender_id,
      request.receiver_id
    );
  } catch (error) {
    // UNIQUE constraint 위반 등 DB 에러 처리
    console.error('[acceptFriendRequest] Failed to create friendship:', error);
    console.error('[acceptFriendRequest] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
    });
    
    // 원본 에러 메시지를 포함하여 throw
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create friendship relationship');
  }

  // 5. 요청 상태 업데이트
  console.log('[acceptFriendRequest] Updating request status to accepted:', requestId);
  const updatedRequest = await friendRequestsRepository.updateStatus(client, requestId, 'accepted');
  console.log('[acceptFriendRequest] Request status updated:', updatedRequest);

  // 6. 알림 생성 (sender에게)
  // 알림 실패해도 친구 관계는 이미 생성됨 (느슨한 결합)
  try {
    await createFriendAcceptedNotification({
      requestId,
      receiverId: request.sender_id!, // 요청 보낸 사람이 알림 받음
      actorId: request.receiver_id!, // 수락한 사람이 actor
    });
  } catch (error) {
    // 알림 생성 실패는 로그만 남기고 에러를 throw하지 않음
    console.error(
      '[acceptFriendRequest] Failed to create notification:',
      error
    );
  }
};


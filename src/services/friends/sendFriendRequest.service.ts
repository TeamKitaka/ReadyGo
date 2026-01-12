import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import * as friendRequestsRepository from '@/repositories/friendRequests.repository';
import * as friendshipRepository from '@/repositories/friendship.repository';

/**
 * 친구 요청 보내기 서비스
 *
 * 📌 책임:
 * - 친구 요청 생성
 * - 중복 체크 (이미 친구인지, pending 요청이 있는지)
 * - 본인 체크
 *
 * 📌 핵심 원칙:
 * - 본인에게 요청 불가
 * - 이미 친구인 경우 요청 불가
 * - 이미 pending 요청이 있는 경우 요청 불가
 */

export interface SendFriendRequestParams {
  senderId: string;
  receiverId: string;
}

/**
 * 친구 요청을 보낸다
 *
 * @param client - Supabase 클라이언트
 * @param params - 요청 파라미터
 * @returns 생성된 친구 요청 데이터
 * @throws Error - 본인에게 요청, 이미 친구, 이미 pending 요청인 경우
 */
export const sendFriendRequest = async (
  client: SupabaseClient<Database>,
  params: SendFriendRequestParams
) => {
  const { senderId, receiverId } = params;

  // 1. 본인 체크
  if (senderId === receiverId) {
    throw new Error('Cannot send friend request to yourself');
  }

  // 2. 이미 친구인지 확인
  const isFriend = await friendshipRepository.exists(
    client,
    senderId,
    receiverId
  );
  if (isFriend) {
    throw new Error('Already friends');
  }

  // 3. 이미 pending 요청이 있는지 확인 (양방향 체크)
  const existingRequest1 =
    await friendRequestsRepository.findPendingBetweenUsers(
      client,
      senderId,
      receiverId
    );
  if (existingRequest1) {
    throw new Error('Friend request already sent');
  }

  // 반대 방향도 체크 (상대방이 나에게 보낸 요청이 있는지)
  const existingRequest2 =
    await friendRequestsRepository.findPendingBetweenUsers(
      client,
      receiverId,
      senderId
    );
  if (existingRequest2) {
    throw new Error('Friend request already received from this user');
  }

  // 4. 친구 요청 생성
  const { data, error } = await client
    .from('friend_requests')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create friend request');
  }

  return data;
};

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * friendRequests Repository
 * 책임: friend_requests 테이블 접근 전담
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 */

type FriendRequestRow = Database['public']['Tables']['friend_requests']['Row'];
type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

/**
 * ID로 친구 요청을 조회한다
 * @param client - Supabase 클라이언트
 * @param requestId - 친구 요청 ID
 * @returns 친구 요청 데이터 또는 null
 */
export const findById = async (
  client: SupabaseClient<Database>,
  requestId: number
): Promise<FriendRequestRow | null> => {
  const { data, error } = await client
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * 친구 요청의 상태를 업데이트한다
 * - RLS 우회를 위해 supabaseAdmin 사용
 * @param client - Supabase 클라이언트 (사용하지 않음, supabaseAdmin 사용)
 * @param requestId - 친구 요청 ID
 * @param status - 새로운 상태
 * @returns 업데이트된 친구 요청 데이터
 */
export const updateStatus = async (
  client: SupabaseClient<Database>,
  requestId: number,
  status: FriendRequestStatus
): Promise<FriendRequestRow | null> => {
  console.log('[friendRequestsRepository.updateStatus] Updating status:', {
    requestId,
    status,
  });

  const { data, error } = await supabaseAdmin
    .from('friend_requests')
    .update({ status })
    .eq('id', requestId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[friendRequestsRepository.updateStatus] Error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  console.log('[friendRequestsRepository.updateStatus] Success:', data);
  return data;
};

/**
 * 두 사용자 간의 pending 상태 친구 요청을 조회한다
 * @param client - Supabase 클라이언트
 * @param senderId - 요청 보낸 사용자 ID
 * @param receiverId - 요청 받은 사용자 ID
 * @returns 친구 요청 데이터 또는 null
 */
export const findPendingBetweenUsers = async (
  client: SupabaseClient<Database>,
  senderId: string,
  receiverId: string
): Promise<FriendRequestRow | null> => {
  const { data, error } = await client
    .from('friend_requests')
    .select('*')
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * 특정 사용자가 받은 친구 요청 목록을 조회한다
 * @param client - Supabase 클라이언트
 * @param receiverId - 요청 받은 사용자 ID
 * @param status - 필터링할 상태 (선택사항, 기본값: 'pending')
 * @returns 친구 요청 목록
 */
export const findByReceiver = async (
  client: SupabaseClient<Database>,
  receiverId: string,
  status?: FriendRequestStatus
): Promise<FriendRequestRow[]> => {
  let query = client
    .from('friend_requests')
    .select('*')
    .eq('receiver_id', receiverId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
};


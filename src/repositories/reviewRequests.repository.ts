import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';

// 타입 정의
type ReviewRequest = Database['public']['Tables']['review_requests']['Row'];

export type UpdateReviewRequestParams = {
  status: 'completed';
  completed_at?: string;
};

/**
 * review_requests 조회 함수
 */

/**
 * reviewer_id와 target_user_id로 review_request 조회 (pending 상태)
 *
 * @param reviewerId - 후기를 작성한 사람 (target_id)
 * @param targetUserId - 후기를 받을 사람 (actor_id)
 * @returns review_request 정보 (없으면 null)
 */
export const getReviewRequestByReviewerAndTarget = async (
  reviewerId: string,
  targetUserId: string
): Promise<ReviewRequest | null> => {
  const { data, error } = await supabaseAdmin
    .from('review_requests')
    .select('*')
    .eq('target_id', reviewerId) // 후기를 작성한 사람
    .eq('actor_id', targetUserId) // 후기를 받을 사람
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * review_request 상태 업데이트
 *
 * @param reviewRequestId - review_request ID
 * @param params - 업데이트 파라미터
 * @returns 업데이트된 review_request 정보
 */
export const updateReviewRequest = async (
  reviewRequestId: number,
  params: UpdateReviewRequestParams
): Promise<ReviewRequest> => {
  const updateData: {
    status: string;
    completed_at?: string;
  } = {
    status: params.status,
  };

  if (params.completed_at) {
    updateData.completed_at = params.completed_at;
  } else if (params.status === 'completed') {
    // completed_at이 제공되지 않으면 현재 시간 사용
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('review_requests')
    .update(updateData)
    .eq('id', reviewRequestId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to update review request: No data returned');
  }

  return data;
};


import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';

// 타입 정의
type Review = Database['public']['Tables']['reviews']['Row'];

export type CreateReviewParams = {
  reviewer_id: string;
  target_user_id: string;
  score_manner: number;
  score_teamwork: number;
  score_communication: number;
  comment?: string | null;
};

// ============================================
// 리뷰 조회 함수 (SELECT)
// ============================================

/**
 * 특정 사용자가 작성한 리뷰 목록을 조회
 *
 * @param reviewerId - 리뷰를 작성한 사용자 ID
 * @param limit - 조회할 최대 개수 (기본값: 50)
 * @param offset - 건너뛸 개수 (기본값: 0)
 * @returns 리뷰 목록 배열
 */
export const getReviewsByReviewer = async (
  reviewerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Review[]> => {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('reviewer_id', reviewerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * 특정 사용자가 받은 리뷰 목록을 조회
 *
 * @param targetUserId - 리뷰를 받은 사용자 ID
 * @param limit - 조회할 최대 개수 (기본값: 50)
 * @param offset - 건너뛸 개수 (기본값: 0)
 * @returns 리뷰 목록 배열
 */
export const getReviewsByTarget = async (
  targetUserId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Review[]> => {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('target_user_id', targetUserId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * 특정 리뷰 ID로 리뷰를 조회
 *
 * @param reviewId - 조회할 리뷰 ID
 * @returns 리뷰 정보 (없으면 null)
 */
export const getReviewById = async (
  reviewId: number
): Promise<Review | null> => {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw error;
  }

  return data;
};

/**
 * 두 사용자 간의 상호 리뷰를 조회
 *
 * @param userId1 - 첫 번째 사용자 ID
 * @param userId2 - 두 번째 사용자 ID
 * @returns 리뷰 목록 배열
 */
export const getReviewsBetweenUsers = async (
  userId1: string,
  userId2: string
): Promise<Review[]> => {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .or(
      `reviewer_id.eq.${userId1}.and.target_user_id.eq.${userId2},reviewer_id.eq.${userId2}.and.target_user_id.eq.${userId1}`
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

// ============================================
// 리뷰 작성 함수 (INSERT)
// ============================================

/**
 * 리뷰를 작성
 *
 * @param params - 리뷰 작성 파라미터
 * @returns 생성된 리뷰 정보
 */
export const createReview = async (
  params: CreateReviewParams
): Promise<Review> => {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .insert({
      reviewer_id: params.reviewer_id,
      target_user_id: params.target_user_id,
      score_manner: params.score_manner,
      score_teamwork: params.score_teamwork,
      score_communication: params.score_communication,
      comment: params.comment ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create review: No data returned');
  }

  return data;
};

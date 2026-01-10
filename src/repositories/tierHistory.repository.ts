import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';

// 타입 정의
type TierHistory = Database['public']['Tables']['tier_history']['Row'];

export type CreateTierHistoryParams = {
  user_id: string;
  previous_tier: string;
  current_tier: string;
};

// ============================================
// 티어 히스토리 조회 함수 (SELECT)
// ============================================

/**
 * 특정 사용자의 티어 히스토리 목록을 조회
 *
 * @param userId - 티어 히스토리를 조회할 사용자 ID
 * @param limit - 조회할 최대 개수 (기본값: 50)
 * @param offset - 건너뛸 개수 (기본값: 0)
 * @returns 티어 히스토리 목록 배열
 */
export const getTierHistoryByUser = async (
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<TierHistory[]> => {
  const { data, error } = await supabaseAdmin
    .from('tier_history')
    .select('*')
    .eq('user_id', userId)
    .order('changed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * 특정 티어 히스토리 ID로 기록을 조회
 *
 * @param historyId - 조회할 티어 히스토리 ID
 * @returns 티어 히스토리 정보 (없으면 null)
 */
export const getTierHistoryById = async (
  historyId: number
): Promise<TierHistory | null> => {
  const { data, error } = await supabaseAdmin
    .from('tier_history')
    .select('*')
    .eq('id', historyId)
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

// ============================================
// 티어 히스토리 작성 함수 (INSERT)
// ============================================

/**
 * 티어 히스토리를 작성
 *
 * @param params - 티어 히스토리 작성 파라미터
 * @returns 생성된 티어 히스토리 정보
 */
export const createTierHistory = async (
  params: CreateTierHistoryParams
): Promise<TierHistory> => {
  const { data, error } = await supabaseAdmin
    .from('tier_history')
    .insert({
      user_id: params.user_id,
      previous_tier: params.previous_tier,
      current_tier: params.current_tier,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create tier history: No data returned');
  }

  return data;
};

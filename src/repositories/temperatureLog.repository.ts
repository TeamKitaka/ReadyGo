import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';

// 타입 정의
type TemperatureLog = Database['public']['Tables']['temperature_logs']['Row'];

export type CreateTemperatureLogParams = {
  user_id: string;
  change: number;
  reason?: string | null;
};

// ============================================
// 온도로그 조회 함수 (SELECT)
// ============================================

/**
 * 특정 사용자의 온도로그 목록을 조회
 *
 * @param userId - 온도로그를 조회할 사용자 ID
 * @param limit - 조회할 최대 개수 (기본값: 50)
 * @param offset - 건너뛸 개수 (기본값: 0)
 * @returns 온도로그 목록 배열
 */
export const getTemperatureLogsByUser = async (
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<TemperatureLog[]> => {
  const { data, error } = await supabaseAdmin
    .from('temperature_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * 특정 온도로그 ID로 로그를 조회
 *
 * @param logId - 조회할 온도로그 ID
 * @returns 온도로그 정보 (없으면 null)
 */
export const getTemperatureLogById = async (
  logId: number
): Promise<TemperatureLog | null> => {
  const { data, error } = await supabaseAdmin
    .from('temperature_logs')
    .select('*')
    .eq('id', logId)
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
// 온도로그 작성 함수 (INSERT)
// ============================================

/**
 * 온도로그를 작성
 *
 * @param params - 온도로그 작성 파라미터
 * @returns 생성된 온도로그 정보
 */
export const createTemperatureLog = async (
  params: CreateTemperatureLogParams
): Promise<TemperatureLog> => {
  const { data, error } = await supabaseAdmin
    .from('temperature_logs')
    .insert({
      user_id: params.user_id,
      change: params.change,
      reason: params.reason ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create temperature log: No data returned');
  }

  return data;
};

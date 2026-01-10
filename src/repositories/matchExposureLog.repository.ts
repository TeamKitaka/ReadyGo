/**
 * Match Exposure Log Repository
 * 
 * 책임:
 * - match_exposure_log 테이블 CRUD
 * - 매칭 목록 노출 이력 관리
 * - 순수 DB 접근만 담당
 * 
 * 비책임:
 * - 비즈니스 로직 (Service에서 처리)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * 최근 N시간 내 노출된 target_id 조회
 * 
 * @param client Supabase 클라이언트
 * @param viewerId viewer 사용자 ID
 * @param hours 조회할 시간 범위 (시간 단위)
 * @returns 최근 노출된 target_id 목록
 */
export const findRecentByViewer = async (
  client: SupabaseClient<Database>,
  viewerId: string,
  hours: number
) => {
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return await client
    .from('match_exposure_log')
    .select('target_id')
    .eq('viewer_id', viewerId)
    .gte('exposed_at', cutoffTime.toISOString())
    .order('exposed_at', { ascending: false });
};

/**
 * 여러 노출 이력 한 번에 기록 (중복 무시)
 * 
 * @param client Supabase 클라이언트
 * @param viewerId viewer 사용자 ID
 * @param targetIds target 사용자 ID 목록
 * @param context 노출 컨텍스트 (기본값: 'match_list')
 * @returns 삽입된 레코드
 */
export const bulkInsert = async (
  client: SupabaseClient<Database>,
  viewerId: string,
  targetIds: string[],
  context: string = 'match_list'
) => {
  if (targetIds.length === 0) {
    return { data: [], error: null };
  }
  
  const records = targetIds.map((targetId) => ({
    viewer_id: viewerId,
    target_id: targetId,
    context,
    exposed_at: new Date().toISOString(),
  }));
  
  // Supabase는 insert 시 중복을 자동으로 무시
  return await client
    .from('match_exposure_log')
    .insert(records)
    .select();
};

/**
 * 오래된 로그 정리 (Cron용)
 * 
 * @param client Supabase 클라이언트
 * @param days 삭제할 기준 일수 (기본값: 7일)
 * @returns 삭제 결과
 */
export const deleteOldRecords = async (
  client: SupabaseClient<Database>,
  days: number = 7
) => {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await client
    .from('match_exposure_log')
    .delete()
    .lt('exposed_at', cutoffDate.toISOString());
};


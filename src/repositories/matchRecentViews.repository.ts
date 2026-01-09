/**
 * Match Recent Views Repository
 * 
 * 책임:
 * - match_recent_views 테이블 CRUD
 * - 프로필 조회 이력 관리
 * - 순수 DB 접근만 담당
 * 
 * 비책임:
 * - 비즈니스 로직 (Service에서 처리)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * 최근 N시간 내 조회한 target_user_id 조회
 * 
 * @param client Supabase 클라이언트
 * @param userId 기준 유저 ID
 * @param hours 조회할 시간 범위 (시간 단위)
 * @returns 최근 조회한 target_user_id 목록
 */
export async function findByViewer(
  client: SupabaseClient<Database>,
  userId: string,
  hours: number
) {
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return await client
    .from('match_recent_views')
    .select('target_user_id')
    .eq('user_id', userId)
    .gte('viewed_at', cutoffTime.toISOString())
    .order('viewed_at', { ascending: false });
}

/**
 * 프로필 조회 이력 기록
 * 
 * @param client Supabase 클라이언트
 * @param userId 기준 유저 ID
 * @param targetUserId 조회한 대상 유저 ID
 * @returns 삽입된 레코드
 */
export async function insert(
  client: SupabaseClient<Database>,
  userId: string,
  targetUserId: string
) {
  return await client
    .from('match_recent_views')
    .insert({
      user_id: userId,
      target_user_id: targetUserId,
      viewed_at: new Date().toISOString(),
    })
    .select();
}

/**
 * 오래된 조회 이력 정리 (Cron용)
 * 
 * @param client Supabase 클라이언트
 * @param days 삭제할 기준 일수 (기본값: 30일)
 * @returns 삭제 결과
 */
export async function deleteOldRecords(
  client: SupabaseClient<Database>,
  days: number = 30
) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await client
    .from('match_recent_views')
    .delete()
    .lt('viewed_at', cutoffDate.toISOString());
}


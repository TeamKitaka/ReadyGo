/**
 * Match Results Cache Repository
 * 
 * 책임:
 * - match_results_cache 테이블 CRUD
 * - 순수 DB 접근만 담당
 * 
 * 비책임:
 * - 비즈니스 로직 (Service에서 처리)
 * - 데이터 변환 (ViewModel에서 처리)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * 캐시된 매칭 결과 타입
 */
export interface CachedMatchResult {
  viewer_id: string;
  target_id: string;
  score: number;
  reasons: any;
  tags: any;
  computed_at: string;
}

/**
 * viewer 기준으로 캐시 조회
 * 
 * @param client Supabase 클라이언트
 * @param viewerId viewer 사용자 ID
 * @param targetIds target 사용자 ID 목록
 * @returns 점수 내림차순 정렬된 캐시 결과
 */
export async function findByViewer(
  client: SupabaseClient<Database>,
  viewerId: string,
  targetIds: string[]
) {
  return await client
    .from('match_results_cache')
    .select('*')
    .eq('viewer_id', viewerId)
    .in('target_id', targetIds)
    .order('score', { ascending: false });
}

/**
 * 캐시 저장 (upsert)
 * 
 * @param client Supabase 클라이언트
 * @param data 저장할 캐시 데이터
 */
export async function upsert(
  client: SupabaseClient<Database>,
  data: {
    viewer_id: string;
    target_id: string;
    score: number;
    reasons: any;
    tags: any;
  }
) {
  return await client
    .from('match_results_cache')
    .upsert(
      {
        ...data,
        computed_at: new Date().toISOString(),
      },
      {
        onConflict: 'viewer_id,target_id',
      }
    );
}

/**
 * 특정 캐시 삭제
 * 
 * @param client Supabase 클라이언트
 * @param viewerId viewer 사용자 ID
 * @param targetId target 사용자 ID
 */
export async function deleteByViewerAndTarget(
  client: SupabaseClient<Database>,
  viewerId: string,
  targetId: string
) {
  return await client
    .from('match_results_cache')
    .delete()
    .eq('viewer_id', viewerId)
    .eq('target_id', targetId);
}

/**
 * viewer의 모든 캐시 삭제
 * 
 * @param client Supabase 클라이언트
 * @param viewerId viewer 사용자 ID
 */
export async function deleteAllByViewer(
  client: SupabaseClient<Database>,
  viewerId: string
) {
  return await client
    .from('match_results_cache')
    .delete()
    .eq('viewer_id', viewerId);
}


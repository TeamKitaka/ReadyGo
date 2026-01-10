/**
 * Party Members Repository
 * 
 * 📌 책임:
 * - party_members 테이블에 대한 데이터 접근
 * - RLS 우회를 위해 supabaseAdmin 사용
 * - 특정 사용자의 파티 참여 개수 조회
 * 
 * 📌 주의:
 * - admin client 사용으로 RLS 무시
 * - 민감한 데이터 접근 시 주의 필요
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';

// 타입 정의
type PartyMemberRow = Database['public']['Tables']['party_members']['Row'];

export type PartyMember = PartyMemberRow;

/**
 * 특정 사용자가 참여한 파티 개수 조회
 * 
 * @param userId - 사용자 ID (UUID)
 * @returns 참여한 파티 개수
 * 
 * @example
 * ```typescript
 * const count = await getPartyMemberCountByUserId('user-uuid');
 * // 5
 * ```
 */
export const getPartyMemberCountByUserId = async (
  userId: string
): Promise<number> => {
  try {
    // RLS 우회를 위해 supabaseAdmin 사용
    const { count, error } = await supabaseAdmin
      .from('party_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('[PartyMembersRepository] Error fetching party count:', error);
      return 0; // 에러 시 0 반환 (Cold Start 대응)
    }

    return count || 0;
  } catch (err) {
    console.error('[PartyMembersRepository] Unexpected error:', err);
    return 0; // 예외 시 0 반환
  }
};

/**
 * 특정 사용자가 참여한 파티 목록 조회
 * 
 * @param userId - 사용자 ID (UUID)
 * @param options - 조회 옵션
 * @returns 참여한 파티 목록
 * 
 * @example
 * ```typescript
 * const members = await getPartyMembersByUserId('user-uuid', { limit: 10 });
 * // [{ post_id: 1, user_id: 'uuid', role: 'member', ... }, ...]
 * ```
 */
export const getPartyMembersByUserId = async (
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<PartyMember[]> => {
  try {
    let query = supabaseAdmin
      .from('party_members')
      .select('*')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PartyMembersRepository] Error fetching party members:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[PartyMembersRepository] Unexpected error:', err);
    return [];
  }
};


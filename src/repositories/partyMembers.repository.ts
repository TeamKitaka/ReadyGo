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
      console.error(
        '[PartyMembersRepository] Error fetching party count:',
        error
      );
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
      console.error(
        '[PartyMembersRepository] Error fetching party members:',
        error
      );
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[PartyMembersRepository] Unexpected error:', err);
    return [];
  }
};

/**
 * 파티 멤버와 프로필 정보를 포함한 타입
 */
export interface PartyMemberWithProfile {
  id: number;
  post_id: number | null;
  user_id: string | null;
  role: string | null;
  joined_at: string | null;
  nickname: string;
  animal_type: string | null;
}

/**
 * 특정 파티의 멤버 목록 조회 (프로필 정보 포함)
 *
 * @param postId - 파티 게시물 ID
 * @returns 멤버 목록 (nickname, animal_type 포함)
 *
 * @example
 * ```typescript
 * const members = await getPartyMembersByPostId(123);
 * // [{ id: 1, post_id: 123, user_id: 'uuid', nickname: '닉네임', animal_type: 'fox', ... }, ...]
 * ```
 */
export const getPartyMembersByPostId = async (
  postId: number
): Promise<PartyMemberWithProfile[]> => {
  try {
    // FK 관계가 없으므로 2단계로 조회

    // 1단계: 파티 멤버의 user_id 조회
    const { data: memberRecords, error: membersError } = await supabaseAdmin
      .from('party_members')
      .select('*')
      .eq('post_id', postId)
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error(
        '[PartyMembersRepository] Error fetching party members:',
        membersError
      );
      return [];
    }

    if (!memberRecords || memberRecords.length === 0) {
      return [];
    }

    // 2단계: user_id로 프로필 정보 조회
    const userIds = memberRecords
      .map((m) => m.user_id)
      .filter((id): id is string => id !== null);

    if (userIds.length === 0) {
      return [];
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, nickname, animal_type')
      .in('id', userIds);

    if (profilesError) {
      console.error(
        '[PartyMembersRepository] Error fetching user profiles:',
        profilesError
      );
      return [];
    }

    // 3단계: 프로필 맵 생성 (id를 키로 사용)
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // 4단계: 멤버 정보와 프로필 정보 결합
    return memberRecords.map((member) => {
      const profile = profileMap.get(member.user_id || '');
      return {
        id: member.id,
        post_id: member.post_id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        nickname: profile?.nickname || '익명',
        animal_type: profile?.animal_type || null,
      };
    });
  } catch (err) {
    console.error('[PartyMembersRepository] Unexpected error:', err);
    return [];
  }
};

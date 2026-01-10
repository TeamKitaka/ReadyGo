import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * user_status Repository
 * 책임: user_status 테이블 접근 전담
 */

export type UserPresenceStatus =
  Database['public']['Enums']['user_presence_status'];

export type UserStatusRow = {
  user_id: string;
  status: UserPresenceStatus;
  updated_at: string;
};

/**
 * user_status 레코드를 user_id로 조회한다
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 */
export const findByUserId = async (
  client: SupabaseClient<Database>,
  userId: string
) => {
  return await client
    .from('user_status')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
};

/**
 * 여러 사용자의 user_status를 한 번에 조회한다
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 */
export const findByUserIds = async (
  client: SupabaseClient<Database>,
  userIds: string[]
) => {
  if (userIds.length === 0) {
    return { data: [], error: null };
  }

  return await client.from('user_status').select('*').in('user_id', userIds);
};

/**
 * user_status 레코드를 업데이트한다
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 * - Supabase 응답 구조를 그대로 반환
 */
export const updateStatus = async (
  client: SupabaseClient<Database>,
  userId: string,
  status: UserPresenceStatus
) => {
  return await client.from('user_status').upsert(
    {
      user_id: userId,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
};

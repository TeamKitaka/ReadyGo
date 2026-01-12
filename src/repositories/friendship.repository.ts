import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * friendship Repository
 * 책임: friendships 테이블 접근 전담
 */

type FriendshipRow = Database['public']['Tables']['friendships']['Row'];

/**
 * 특정 사용자의 친구 user_id 목록을 조회한다 (status='accepted'만)
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 * - friendships 테이블은 user_a, user_b 양방향 관계이므로 두 경우 모두 조회
 */
export const getFriendUserIds = async (
  client: SupabaseClient<Database>,
  userId: string
): Promise<string[]> => {
  // user_a인 경우 조회
  const { data: friendsA, error: errorA } = await client
    .from('friendships')
    .select('user_b')
    .eq('user_a', userId)
    .eq('status', 'accepted');

  if (errorA) {
    throw errorA;
  }

  // user_b인 경우 조회
  const { data: friendsB, error: errorB } = await client
    .from('friendships')
    .select('user_a')
    .eq('user_b', userId)
    .eq('status', 'accepted');

  if (errorB) {
    throw errorB;
  }

  // 두 결과 합치기 (중복 제거)
  const userIdsSet = new Set<string>();

  if (friendsA) {
    for (const row of friendsA) {
      if (row.user_b) {
        userIdsSet.add(row.user_b);
      }
    }
  }

  if (friendsB) {
    for (const row of friendsB) {
      if (row.user_a) {
        userIdsSet.add(row.user_a);
      }
    }
  }

  return Array.from(userIdsSet);
};

/**
 * 두 사용자 간의 양방향 친구 관계를 생성한다
 * - 트랜잭션처럼 동작: 2개 row를 순차적으로 생성하되, 하나라도 실패하면 에러 발생
 * - (userA → userB, status='accepted')
 * - (userB → userA, status='accepted')
 * - RLS 우회를 위해 supabaseAdmin 사용
 * @param client - Supabase 클라이언트 (사용하지 않음, supabaseAdmin 사용)
 * @param userA - 첫 번째 사용자 ID
 * @param userB - 두 번째 사용자 ID
 * @returns 생성된 친구 관계 데이터
 */
export const createPair = async (
  client: SupabaseClient<Database>,
  userA: string,
  userB: string
): Promise<FriendshipRow[]> => {
  // eslint-disable-next-line no-console
  console.log('[friendshipRepository.createPair] Creating pair:', {
    userA,
    userB,
  });

  // RLS 우회를 위해 supabaseAdmin 사용
  // 첫 번째 row 생성 (userA → userB)
  const { data: firstRow, error: firstError } = await supabaseAdmin
    .from('friendships')
    .insert({
      user_a: userA,
      user_b: userB,
      status: 'accepted',
    })
    .select()
    .single();

  if (firstError) {
    console.error('[friendshipRepository.createPair] First insert error:', {
      code: firstError.code,
      message: firstError.message,
      details: firstError.details,
      hint: firstError.hint,
    });

    // UNIQUE constraint 위반인 경우 더 명확한 에러 메시지
    if (firstError.code === '23505' || firstError.message?.includes('unique')) {
      throw new Error('Friendship already exists');
    }
    throw firstError;
  }

  // 두 번째 row 생성 (userB → userA)
  const { data: secondRow, error: secondError } = await supabaseAdmin
    .from('friendships')
    .insert({
      user_a: userB,
      user_b: userA,
      status: 'accepted',
    })
    .select()
    .single();

  if (secondError) {
    console.error('[friendshipRepository.createPair] Second insert error:', {
      code: secondError.code,
      message: secondError.message,
      details: secondError.details,
      hint: secondError.hint,
    });

    // 두 번째 insert 실패 시 첫 번째 row는 이미 생성됨
    // 하지만 UNIQUE constraint로 인해 중복 생성은 방지됨
    if (
      secondError.code === '23505' ||
      secondError.message?.includes('unique')
    ) {
      throw new Error('Friendship already exists');
    }
    throw secondError;
  }

  if (!firstRow || !secondRow) {
    throw new Error('Failed to create friendship pair');
  }

  return [firstRow, secondRow];
};

/**
 * 두 사용자 간의 친구 관계 존재 여부를 확인한다
 * @param client - Supabase 클라이언트
 * @param userA - 첫 번째 사용자 ID
 * @param userB - 두 번째 사용자 ID
 * @returns 친구 관계 존재 여부
 */
export const exists = async (
  client: SupabaseClient<Database>,
  userA: string,
  userB: string
): Promise<boolean> => {
  // userA → userB 또는 userB → userA 중 하나라도 존재하면 친구 관계 존재
  // 두 가지 경우를 각각 조회하여 OR 조건 구현
  const { data: data1, error: error1 } = await client
    .from('friendships')
    .select('id')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .eq('status', 'accepted')
    .limit(1);

  if (error1) {
    throw error1;
  }

  // 첫 번째 쿼리에서 결과가 있으면 바로 반환
  if (data1 && data1.length > 0) {
    return true;
  }

  // 두 번째 경우 조회
  const { data: data2, error: error2 } = await client
    .from('friendships')
    .select('id')
    .eq('user_a', userB)
    .eq('user_b', userA)
    .eq('status', 'accepted')
    .limit(1);

  if (error2) {
    throw error2;
  }

  return (data2?.length ?? 0) > 0;
};

/**
 * 두 사용자 간의 친구 관계를 삭제한다 (양방향 모두 삭제)
 * @param client - Supabase 클라이언트
 * @param userA - 첫 번째 사용자 ID
 * @param userB - 두 번째 사용자 ID
 * @returns 삭제된 row 개수
 */
export const deletePair = async (
  client: SupabaseClient<Database>,
  userA: string,
  userB: string
): Promise<void> => {
  // userA → userB 삭제
  const { error: error1 } = await client
    .from('friendships')
    .delete()
    .eq('user_a', userA)
    .eq('user_b', userB);

  if (error1) {
    throw error1;
  }

  // userB → userA 삭제
  const { error: error2 } = await client
    .from('friendships')
    .delete()
    .eq('user_a', userB)
    .eq('user_b', userA);

  if (error2) {
    throw error2;
  }
};

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';
import type { Json } from '../../supabase/types/database.types';
import { calculateStartAt } from '@/lib/utils/party';

// 타입 정의
type PartyPostRow = Database['public']['Tables']['party_posts']['Row'];
type PartyPostInsert = Database['public']['Tables']['party_posts']['Insert'];
type PartyPostUpdate = Database['public']['Tables']['party_posts']['Update'];

// status 필드가 타입 정의에 없을 수 있으므로 확장된 타입 정의
export type PartyPost = PartyPostRow & {
  status?: string;
};

// 정렬 옵션 타입
export type SortOption = 'latest' | 'deadline';

// 조회 옵션 타입
export interface GetPartyPostsOptions {
  limit?: number;
  offset?: number;
  sortOption?: SortOption;
  creatorId?: string;
  gameTitle?: string;
  status?: string;
}

// Phase 5: 커서 기반 페이징용
export interface PartyPostCursor {
  created_at?: string;
  start_at?: string;
  id: number;
}

export interface GetPartyPostsWithCursorOptions {
  limit?: number;
  cursor?: PartyPostCursor;
  sortOption?: SortOption;
  creatorId?: string;
  gameTitle?: string;
  status?: string;
}

// 생성 입력 타입
export interface CreatePartyPostInput {
  creator_id: string;
  game_title: string;
  party_title: string;
  start_date: string;
  start_time: string;
  description: string;
  max_members: number;
  control_level: string;
  difficulty: string;
  voice_chat?: string | null;
  tags?: Json | null;
  status?: string;
}

// 수정 입력 타입
export interface UpdatePartyPostInput {
  game_title?: string;
  party_title?: string;
  start_date?: string;
  start_time?: string;
  description?: string;
  max_members?: number;
  control_level?: string;
  difficulty?: string;
  voice_chat?: string | null;
  tags?: Json | null;
  status?: string;
}

// ============================================
// 파티 게시물 조회 함수
// ============================================

/**
 * 파티 게시물 목록을 조회
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 * - sortOption에 따라 정렬 기준 변경
 *   - 'latest': created_at 기준 내림차순 (최신 게시물이 먼저)
 *   - 'deadline': start_at 기준 오름차순 (마감임박순)
 */
export const getPartyPosts = async (
  options?: GetPartyPostsOptions
): Promise<PartyPost[]> => {
  const {
    limit = 50,
    offset = 0,
    sortOption = 'latest',
    creatorId,
    gameTitle,
    status,
  } = options || {};

  let query = supabaseAdmin.from('party_posts').select('*');

  // 최신순/마감임박순 정렬 시 시작시간이 지난 게시글 제외
  const now = new Date().toISOString();
  query = query.gte('start_at', now);

  // 필터 조건 적용 (정렬 전에 필터 적용)
  if (creatorId) {
    query = query.eq('creator_id', creatorId);
  }

  if (gameTitle) {
    query = query.ilike('game_title', `%${gameTitle}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  // 정렬 기준에 따라 분기
  if (sortOption === 'latest') {
    query = query.order('created_at', { ascending: false });
  } else if (sortOption === 'deadline') {
    query = query.order('start_at', { ascending: true });
  }

  // 페이징 적용
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as PartyPost[];
};

/**
 * 파티 게시물 목록을 커서 기반 페이징으로 조회
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 * - sortOption에 따라 정렬 기준 변경
 *   - 'latest': created_at 기준 내림차순 (최신 게시물이 먼저)
 *   - 'deadline': start_at 기준 오름차순 (마감임박순)
 * - 커서가 없으면 첫 페이지 반환
 * - 반환값에 nextCursor 포함 (다음 페이지가 있으면)
 */
export const getPartyPostsWithCursor = async (
  options?: GetPartyPostsWithCursorOptions
): Promise<{ data: PartyPost[]; nextCursor: PartyPostCursor | null }> => {
  const {
    limit = 50,
    cursor,
    sortOption = 'latest',
    creatorId,
    gameTitle,
    status,
  } = options || {};

  let query = supabaseAdmin.from('party_posts').select('*');

  // 최신순/마감임박순 정렬 시 시작시간이 지난 게시글 제외
  const now = new Date().toISOString();
  query = query.gte('start_at', now);

  // 필터 조건 적용 (정렬 전에 필터 적용)
  if (creatorId) {
    query = query.eq('creator_id', creatorId);
  }

  if (gameTitle) {
    query = query.ilike('game_title', `%${gameTitle}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  // 커서 기반 필터링
  if (cursor) {
    if (sortOption === 'latest') {
      // created_at < cursor.created_at OR (created_at = cursor.created_at AND id < cursor.id)
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
      );
      query = query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
    } else if (sortOption === 'deadline') {
      // start_at > cursor.start_at OR (start_at = cursor.start_at AND id > cursor.id)
      query = query.or(
        `start_at.gt.${cursor.start_at},and(start_at.eq.${cursor.start_at},id.gt.${cursor.id})`
      );
      query = query.order('start_at', { ascending: true }).order('id', {
        ascending: true,
      });
    }
  } else {
    // 첫 페이지
    if (sortOption === 'latest') {
      query = query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
    } else {
      query = query.order('start_at', { ascending: true }).order('id', {
        ascending: true,
      });
    }
  }

  // limit + 1로 조회하여 다음 페이지 존재 여부 확인
  query = query.limit(limit + 1);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const posts = (data || []) as PartyPost[];
  const hasMore = posts.length > limit;
  const paginatedPosts = posts.slice(0, limit);

  // 다음 커서 생성
  const nextCursor: PartyPostCursor | null =
    hasMore && paginatedPosts.length > 0
      ? {
          ...(sortOption === 'latest'
            ? {
                created_at:
                  paginatedPosts[paginatedPosts.length - 1].created_at,
                id: paginatedPosts[paginatedPosts.length - 1].id,
              }
            : {
                start_at: paginatedPosts[paginatedPosts.length - 1].start_at,
                id: paginatedPosts[paginatedPosts.length - 1].id,
              }),
        }
      : null;

  return { data: paginatedPosts, nextCursor };
};

/**
 * 특정 파티 게시물을 단일 조회
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 */
export const getPartyPost = async (
  postId: number
): Promise<PartyPost | null> => {
  const { data, error } = await supabaseAdmin
    .from('party_posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (error) {
    // PGRST116: No rows returned (게시물이 존재하지 않음)
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data as PartyPost | null;
};

// ============================================
// 파티 게시물 작성 함수
// ============================================

/**
 * 파티 게시물을 생성
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 * - creatorId는 인증된 사용자여야 함 (검증은 호출부에서 수행)
 * - start_at은 start_date와 start_time으로부터 자동 계산
 */
export const createPartyPost = async (
  input: CreatePartyPostInput
): Promise<PartyPost> => {
  // start_at 자동 계산
  const startAt = calculateStartAt(input.start_date, input.start_time);

  const insertData: PartyPostInsert = {
    creator_id: input.creator_id,
    game_title: input.game_title,
    party_title: input.party_title,
    start_date: input.start_date,
    start_time: input.start_time,
    start_at: startAt,
    description: input.description,
    max_members: input.max_members,
    control_level: input.control_level,
    difficulty: input.difficulty,
    voice_chat: input.voice_chat ?? null,
    tags: input.tags ?? null,
  };

  // status 필드가 타입 정의에 없을 수 있으므로 조건부로 추가
  // 기본값: 'recruiting' (프롬프트 요구사항)
  const { data, error } = await supabaseAdmin
    .from('party_posts')
    .insert({
      ...insertData,
      status: input.status ?? 'recruiting',
    } as PartyPostInsert & { status?: string })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('파티 게시물 생성에 실패했습니다.');
  }

  return data as PartyPost;
};

// ============================================
// 파티 게시물 수정 함수
// ============================================

/**
 * 파티 게시물을 수정
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 * - 작성자 권한 검증은 호출부에서 수행해야 함
 * - start_date 또는 start_time 변경 시 start_at 자동 재계산
 */
export const updatePartyPost = async (
  postId: number,
  input: UpdatePartyPostInput
): Promise<PartyPost> => {
  const updateData: Partial<PartyPostUpdate> = {};

  if (input.game_title !== undefined) {
    updateData.game_title = input.game_title;
  }
  if (input.party_title !== undefined) {
    updateData.party_title = input.party_title;
  }
  if (input.start_date !== undefined) {
    updateData.start_date = input.start_date;
  }
  if (input.start_time !== undefined) {
    updateData.start_time = input.start_time;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.max_members !== undefined) {
    updateData.max_members = input.max_members;
  }
  if (input.control_level !== undefined) {
    updateData.control_level = input.control_level;
  }
  if (input.difficulty !== undefined) {
    updateData.difficulty = input.difficulty;
  }
  if (input.voice_chat !== undefined) {
    updateData.voice_chat = input.voice_chat;
  }
  if (input.tags !== undefined) {
    updateData.tags = input.tags;
  }

  // start_date 또는 start_time이 변경되면 start_at 재계산
  if (input.start_date !== undefined || input.start_time !== undefined) {
    // 기존 데이터 조회 필요 (변경되지 않은 값 가져오기)
    const existing = await getPartyPost(postId);
    if (!existing) {
      throw new Error('파티 게시물을 찾을 수 없습니다.');
    }

    const finalStartDate = input.start_date ?? existing.start_date;
    const finalStartTime = input.start_time ?? existing.start_time;
    updateData.start_at = calculateStartAt(finalStartDate, finalStartTime);
  }

  // status 필드가 타입 정의에 없을 수 있으므로 조건부로 추가
  const updatePayload = {
    ...updateData,
    ...(input.status !== undefined && { status: input.status }),
  } as PartyPostUpdate & { status?: string };

  const { data, error } = await supabaseAdmin
    .from('party_posts')
    .update(updatePayload)
    .eq('id', postId)
    .select()
    .single();

  if (error) {
    // PGRST116: No rows returned (게시물이 존재하지 않음)
    if (error.code === 'PGRST116') {
      throw new Error('파티 게시물을 찾을 수 없습니다.');
    }
    throw error;
  }

  if (!data) {
    throw new Error('파티 게시물 수정에 실패했습니다.');
  }

  return data as PartyPost;
};

// ============================================
// 파티 게시물 삭제 함수
// ============================================

/**
 * 파티 게시물을 삭제 (hard delete)
 * - DB 접근만 수행, 에러 처리 없음
 * - 게시물이 존재하지 않아도 에러를 throw하지 않음 (idempotent)
 */
export const deletePartyPost = async (postId: number): Promise<void> => {
  const { error } = await supabaseAdmin
    .from('party_posts')
    .delete()
    .eq('id', postId);

  if (error) {
    throw error;
  }
};

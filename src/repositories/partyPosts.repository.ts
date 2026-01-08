import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';
import type { Json } from '../../supabase/types/database.types';

// 타입 정의
type PartyPostRow = Database['public']['Tables']['party_posts']['Row'];
type PartyPostInsert = Database['public']['Tables']['party_posts']['Insert'];
type PartyPostUpdate = Database['public']['Tables']['party_posts']['Update'];

// status 필드가 타입 정의에 없을 수 있으므로 확장된 타입 정의
export type PartyPost = PartyPostRow & {
  status?: string;
};

// 조회 옵션 타입
export interface GetPartyPostsOptions {
  limit?: number;
  offset?: number;
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
 * - created_at 기준 내림차순 정렬 (최신 게시물이 먼저)
 */
export const getPartyPosts = async (
  options?: GetPartyPostsOptions
): Promise<PartyPost[]> => {
  const {
    limit = 50,
    offset = 0,
    creatorId,
    gameTitle,
    status,
  } = options || {};

  let query = supabaseAdmin
    .from('party_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (creatorId) {
    query = query.eq('creator_id', creatorId);
  }

  if (gameTitle) {
    query = query.ilike('game_title', `%${gameTitle}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as PartyPost[];
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
 */
export const createPartyPost = async (
  input: CreatePartyPostInput
): Promise<PartyPost> => {
  const insertData: PartyPostInsert = {
    creator_id: input.creator_id,
    game_title: input.game_title,
    party_title: input.party_title,
    start_date: input.start_date,
    start_time: input.start_time,
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

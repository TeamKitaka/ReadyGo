import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';

// 타입 정의
type GameStartLog = Database['public']['Tables']['game_start_logs']['Row'];

export type CreateGameStartLogParams = {
  actor_id: string;
  context_type: string;
  context_id: string;
  game_id?: string | null;
  game_name?: string | null;
};

// ============================================
// 게임 시작 로그 조회 함수 (SELECT)
// ============================================

/**
 * 특정 유저가 남긴 게임 시작 로그 목록을 조회
 *
 * @param actorId - 게임 시작을 요청한 유저 ID
 * @param limit - 조회할 최대 개수 (기본값: 50)
 * @param offset - 건너뛸 개수 (기본값: 0)
 * @returns 게임 시작 로그 목록 배열
 */
export const getGameStartLogsByActor = async (
  actorId: string,
  limit: number = 50,
  offset: number = 0
): Promise<GameStartLog[]> => {
  const { data, error } = await supabaseAdmin
    .from('game_start_logs')
    .select('*')
    .eq('actor_id', actorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * 특정 컨텍스트(match, party 등)에서 발생한 게임 시작 로그 목록을 조회
 *
 * @param contextType - 컨텍스트 타입 (match, party 등)
 * @param contextId - 컨텍스트 식별자 (매칭 ID 또는 파티 ID)
 * @param limit - 조회할 최대 개수 (기본값: 50)
 * @param offset - 건너뛸 개수 (기본값: 0)
 * @returns 게임 시작 로그 목록 배열
 */
export const getGameStartLogsByContext = async (
  contextType: string,
  contextId: string,
  limit: number = 50,
  offset: number = 0
): Promise<GameStartLog[]> => {
  const { data, error } = await supabaseAdmin
    .from('game_start_logs')
    .select('*')
    .eq('context_type', contextType)
    .eq('context_id', contextId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * 특정 게임 시작 로그 ID로 단일 로그를 조회
 *
 * @param logId - 조회할 게임 시작 로그 ID
 * @returns 게임 시작 로그 정보 (없으면 null)
 */
export const getGameStartLogById = async (
  logId: number
): Promise<GameStartLog | null> => {
  const { data, error } = await supabaseAdmin
    .from('game_start_logs')
    .select('*')
    .eq('id', logId)
    .maybeSingle();

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
// 게임 시작 로그 작성 함수 (INSERT)
// ============================================

/**
 * 게임 시작 로그를 작성
 *
 * @param params - 게임 시작 로그 작성 파라미터
 * @returns 생성된 게임 시작 로그 정보
 */
export const createGameStartLog = async (
  params: CreateGameStartLogParams
): Promise<GameStartLog> => {
  const { data, error } = await supabaseAdmin
    .from('game_start_logs')
    .insert({
      actor_id: params.actor_id,
      context_type: params.context_type,
      context_id: params.context_id,
      game_id: params.game_id ?? null,
      game_name: params.game_name ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create game start log: No data returned');
  }

  return data;
};

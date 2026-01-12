import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';

// 타입 정의
type PartyMessage = Database['public']['Tables']['party_messages']['Row'];
type PartyMember = Database['public']['Tables']['party_members']['Row'];

// ============================================
// 파티 채팅방 관련 함수 (개념상 "채팅방" = party_post)
// ============================================

/**
 * 특정 파티의 모든 참여자 조회
 * - DB 접근만 수행, 에러 처리 없음
 * - Supabase 응답 구조를 그대로 반환
 */
export const getPartyMembers = async (
  postId: number
): Promise<PartyMember[]> => {
  const { data, error } = await supabaseAdmin
    .from('party_members')
    .select('*')
    .eq('post_id', postId);

  if (error) {
    throw error;
  }

  return data || [];
};

// ============================================
// 파티 메시지 관련 함수 (핵심)
// ============================================

/**
 * 특정 파티(post_id)의 메시지 목록을 조회
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 * - created_at 기준 내림차순 정렬 (최신 메시지가 먼저)
 */
export const getPartyMessages = async (
  postId: number,
  limit: number = 50,
  offset: number = 0
): Promise<PartyMessage[]> => {
  const { data, error } = await supabaseAdmin
    .from('party_messages')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * 파티 메시지를 전송
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 * - senderId는 해당 postId의 party_members에 포함된 사용자여야 함 (검증은 호출부에서 수행)
 */
export const sendPartyMessage = async (
  postId: number,
  senderId: string,
  content: string,
  contentType: string = 'text'
): Promise<PartyMessage> => {
  const { data, error } = await supabaseAdmin
    .from('party_messages')
    .insert({
      post_id: postId,
      sender_id: senderId,
      content,
      content_type: contentType,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('메시지 생성에 실패했습니다.');
  }

  return data;
};

/**
 * 파티 메시지를 삭제 (hard delete)
 * - DB 접근만 수행, 에러 처리 없음
 */
export const deletePartyMessage = async (messageId: number): Promise<void> => {
  const { error } = await supabaseAdmin
    .from('party_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    throw error;
  }
};

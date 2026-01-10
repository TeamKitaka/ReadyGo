import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';

// 타입 정의
type ChatRoomMember = Database['public']['Tables']['chat_room_members']['Row'];

// ============================================
// 채팅방 멤버 관련 함수
// ============================================

/**
 * 특정 채팅방(room_id)에 속한 모든 user_id를 조회
 * - DB 접근만 수행, 에러 처리 없음
 * - Supabase 응답 구조를 그대로 반환
 * - room_id와 user_id가 null이 아닌 레코드만 조회
 * - 조회 결과가 없으면 빈 배열([])을 반환
 */
export const getChatRoomUserIds = async (roomId: number): Promise<string[]> => {
  const { data, error } = await supabaseAdmin
    .from('chat_room_members')
    .select('user_id')
    .eq('room_id', roomId)
    .not('room_id', 'is', null)
    .not('user_id', 'is', null);

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  // user_id가 null이 아닌 값만 필터링하여 반환
  return data
    .map((member) => member.user_id)
    .filter((id): id is string => id !== null && id !== undefined);
};

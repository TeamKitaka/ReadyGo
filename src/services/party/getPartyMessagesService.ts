import * as partyMessagesRepository from '@/repositories/partyMessages.repository';
import {
  ChatFetchError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';
import type { Database } from '@/types/supabase';
import { supabaseAdmin } from '@/lib/supabase/admin';

type PartyMessage = Database['public']['Tables']['party_messages']['Row'];

/**
 * 파티 메시지 목록 조회 Service
 *
 * 책임:
 * - 입력 검증 (postId, limit, offset, userId)
 * - party_members에서 사용자의 joined_at 조회
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 */
export const getPartyMessagesService = async (
  postId: number,
  limit: number = 50,
  offset: number = 0,
  userId?: string | null
): Promise<PartyMessage[]> => {
  // 입력 검증
  if (typeof postId !== 'number' || isNaN(postId) || postId <= 0) {
    throw new ChatValidationError('postId는 양수여야 합니다.');
  }

  if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
    throw new ChatValidationError('limit은 1 이상의 숫자여야 합니다.');
  }

  if (typeof offset !== 'number' || isNaN(offset) || offset < 0) {
    throw new ChatValidationError('offset은 0 이상의 숫자여야 합니다.');
  }

  try {
    // userId가 제공된 경우, party_members에서 joined_at 조회
    let joinedAt: string | null | undefined = undefined;

    if (userId) {
      const { data: memberData, error: memberError } = await supabaseAdmin
        .from('party_members')
        .select('joined_at')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      // 멤버가 존재하면 joined_at 사용, 없으면 undefined (모든 메시지 조회)
      if (!memberError && memberData) {
        joinedAt = memberData.joined_at;
      }
      // memberError가 있어도 joinedAt은 undefined로 유지 (모든 메시지 조회)
    }

    const messages = await partyMessagesRepository.getPartyMessages(
      postId,
      limit,
      offset,
      joinedAt
    );
    return messages;
  } catch (error) {
    throw new ChatFetchError(
      'messages',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

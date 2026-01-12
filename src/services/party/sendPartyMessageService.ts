import * as partyMessagesRepository from '@/repositories/partyMessages.repository';
import {
  ChatCreateError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';
import type { Database } from '@/types/supabase';

type PartyMessage = Database['public']['Tables']['party_messages']['Row'];

/**
 * 파티 메시지 전송 Service
 *
 * 책임:
 * - 입력 검증 (postId, senderId, content)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - 파티 존재 여부 확인
 */
export const sendPartyMessageService = async (
  postId: number,
  senderId: string,
  content: string,
  contentType: string = 'text'
): Promise<PartyMessage> => {
  // 입력 검증
  if (typeof postId !== 'number' || isNaN(postId) || postId <= 0) {
    throw new ChatValidationError('postId는 양수여야 합니다.');
  }

  if (
    !senderId ||
    typeof senderId !== 'string' ||
    senderId.trim().length === 0
  ) {
    throw new ChatValidationError(
      'senderId는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new ChatValidationError(
      'content는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  try {
    const message = await partyMessagesRepository.sendPartyMessage(
      postId,
      senderId,
      content.trim(),
      contentType
    );

    if (!message) {
      throw new ChatCreateError('message', '메시지 생성에 실패했습니다.');
    }

    return message;
  } catch (error) {
    if (
      error instanceof ChatCreateError ||
      error instanceof ChatValidationError
    ) {
      throw error;
    }

    throw new ChatCreateError(
      'message',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

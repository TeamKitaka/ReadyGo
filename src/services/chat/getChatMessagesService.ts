import * as chatRepository from '@/repositories/chat.repository';
import {
  ChatFetchError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { ChatMessage } from '@/types/chat';

/**
 * 채팅방 메시지 목록 조회 Service
 *
 * 책임:
 * - 입력 검증 (roomId, userId, limit, offset)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 */
export const getChatMessagesService = async (
  client: SupabaseClient<Database>,
  roomId: number,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ChatMessage[]> => {
  // 입력 검증
  if (typeof roomId !== 'number' || isNaN(roomId) || roomId <= 0) {
    throw new ChatValidationError('roomId는 양수여야 합니다.');
  }

  if (!userId || typeof userId !== 'string') {
    throw new ChatValidationError('userId는 필수입니다.');
  }

  if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
    throw new ChatValidationError('limit은 1 이상의 숫자여야 합니다.');
  }

  if (typeof offset !== 'number' || isNaN(offset) || offset < 0) {
    throw new ChatValidationError('offset은 0 이상의 숫자여야 합니다.');
  }

  try {
    const messages = await chatRepository.getChatMessages(
      client,
      roomId,
      userId,
      limit,
      offset
    );
    return messages;
  } catch (error) {
    throw new ChatFetchError(
      'messages',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

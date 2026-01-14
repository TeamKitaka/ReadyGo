import * as chatRepository from '@/repositories/chat.repository';
import {
  ChatUpdateError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * 채팅방의 모든 메시지 읽음 처리 Service
 *
 * 책임:
 * - 입력 검증 (roomId, userId)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 */
export const markRoomAsReadService = async (
  client: SupabaseClient<Database>,
  roomId: number,
  userId: string
): Promise<void> => {
  // 입력 검증
  if (typeof roomId !== 'number' || isNaN(roomId) || roomId <= 0) {
    throw new ChatValidationError('roomId는 양수여야 합니다.');
  }

  if (!userId || typeof userId !== 'string') {
    throw new ChatValidationError('userId는 필수입니다.');
  }

  try {
    await chatRepository.markRoomAsRead(client, roomId, userId);
  } catch (error) {
    // 에러 상세 정보 로깅
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorDetails =
      error && typeof error === 'object' && 'details' in error
        ? (error as { details?: string }).details
        : undefined;
    const errorCode =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code?: string }).code
        : undefined;

    console.error('[markRoomAsReadService] Error:', {
      message: errorMessage,
      details: errorDetails,
      code: errorCode,
      roomId,
      userId,
      error,
    });

    throw new ChatUpdateError('read_status', errorMessage || 'Unknown error');
  }
};

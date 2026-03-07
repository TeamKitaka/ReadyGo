import * as chatRepository from '@/repositories/chat.repository';
import {
  ChatUpdateError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { appendFile } from 'fs/promises';
import { join } from 'path';

// #region agent log helper
const logToFile = async (data: object) => {
  try {
    const logPath = join(process.cwd(), '.cursor', 'debug.log');
    await appendFile(logPath, `${JSON.stringify(data)}\n`);
  } catch {
    // Ignore log errors
  }
};
// #endregion

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
    // #region agent log
    await logToFile({
      location: 'services/chat/markRoomAsReadService.ts:33',
      message: 'markRoomAsReadService: calling repository',
      data: { roomId, userId },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B',
    });
    // #endregion
    await chatRepository.markRoomAsRead(client, roomId, userId);
    // #region agent log
    await logToFile({
      location: 'services/chat/markRoomAsReadService.ts:35',
      message: 'markRoomAsReadService: repository completed',
      data: { roomId, userId },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B',
    });
    // #endregion
  } catch (error) {
    // 에러 상세 정보 추출 (Supabase 에러 객체 처리)
    let errorMessage = 'Unknown error';
    let errorDetails: string | undefined;
    let errorCode: string | undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      // Supabase 에러 객체 처리
      if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if ('error' in error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else {
        // 객체를 문자열로 변환
        errorMessage = JSON.stringify(error);
      }

      if ('details' in error && typeof error.details === 'string') {
        errorDetails = error.details;
      }
      if ('code' in error && typeof error.code === 'string') {
        errorCode = error.code;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // #region agent log
    await logToFile({
      location: 'services/chat/markRoomAsReadService.ts:48',
      message: 'markRoomAsReadService: error caught',
      data: {
        error: errorMessage,
        details: errorDetails,
        code: errorCode,
        roomId,
        userId,
        errorType: error?.constructor?.name,
        errorString: String(error),
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B',
    });
    // #endregion

    console.error('[markRoomAsReadService] Error:', {
      message: errorMessage,
      details: errorDetails,
      code: errorCode,
      roomId,
      userId,
      error,
      errorType: error?.constructor?.name,
      errorString: String(error),
    });

    // ChatUpdateError는 read_status의 경우 "Failed to mark messages as read" 메시지를 생성함
    // (실제로는 chat_message_reads INSERT 에러이지만, 에러 타입은 ChatUpdateError 사용)
    throw new ChatUpdateError('read_status', errorMessage);
  }
};

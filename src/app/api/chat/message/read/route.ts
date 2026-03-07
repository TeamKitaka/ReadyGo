import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { markRoomAsReadService } from '@/services/chat/markRoomAsReadService';
import { markMessagesAsReadService } from '@/services/chat/markMessagesAsReadService';
import {
  ChatUpdateError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';
import { appendFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

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
 * POST /api/chat/message/read
 *
 * 책임:
 * - 인증 확인 (supabase.auth.getUser)
 * - userId는 auth.uid()에서만 추출
 * - 요청 본문 파싱 (roomId, messageIds)
 * - messageIds가 없으면: markRoomAsReadService 호출
 * - messageIds가 있으면: markMessagesAsReadService 호출
 * - Service 에러를 HTTP 상태 코드로 매핑
 *
 * 비책임:
 * - Service 로직 재구현 금지
 */
export const POST = async (request: NextRequest) => {
  try {
    // #region agent log
    await logToFile({
      location: 'api/chat/message/read/route.ts:26',
      message: 'POST /api/chat/message/read: starting',
      data: {},
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B',
    });
    // #endregion
    // 1. 인증된 클라이언트 생성
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // #region agent log
      await logToFile({
        location: 'api/chat/message/read/route.ts:35',
        message: 'POST /api/chat/message/read: auth failed',
        data: { authError: authError?.message },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      });
      // #endregion
      return NextResponse.json(
        {
          message: 'Unauthorized',
          detail: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // 3. userId는 auth.uid()에서만 추출
    const userId = user.id;

    // 4. 요청 본문 파싱
    const body = await request.json();
    const { roomId, messageIds } = body;

    // #region agent log
    await logToFile({
      location: 'api/chat/message/read/route.ts:50',
      message: 'POST /api/chat/message/read: parsed body',
      data: {
        roomId,
        userId,
        hasMessageIds: !!messageIds,
        messageIdsCount: Array.isArray(messageIds) ? messageIds.length : 0,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B',
    });
    // #endregion

    // 5. Service 호출
    // messageIds가 제공된 경우: 특정 메시지들만 읽음 처리
    if (messageIds && Array.isArray(messageIds)) {
      // #region agent log
      await logToFile({
        location: 'api/chat/message/read/route.ts:54',
        message:
          'POST /api/chat/message/read: calling markMessagesAsReadService',
        data: { roomId, userId, messageIdsCount: messageIds.length },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      });
      // #endregion
      await markMessagesAsReadService(supabase, roomId, userId, messageIds);
      // #region agent log
      await logToFile({
        location: 'api/chat/message/read/route.ts:56',
        message:
          'POST /api/chat/message/read: markMessagesAsReadService completed',
        data: { roomId, userId },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      });
      // #endregion
    } else {
      // messageIds가 없는 경우: 해당 채팅방의 모든 메시지를 읽음 처리
      // #region agent log
      await logToFile({
        location: 'api/chat/message/read/route.ts:58',
        message: 'POST /api/chat/message/read: calling markRoomAsReadService',
        data: { roomId, userId },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      });
      // #endregion
      await markRoomAsReadService(supabase, roomId, userId);
      // #region agent log
      await logToFile({
        location: 'api/chat/message/read/route.ts:60',
        message: 'POST /api/chat/message/read: markRoomAsReadService completed',
        data: { roomId, userId },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      });
      // #endregion
    }

    // 6. 정상 응답
    // #region agent log
    await logToFile({
      location: 'api/chat/message/read/route.ts:62',
      message: 'POST /api/chat/message/read: success',
      data: { roomId, userId },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B',
    });
    // #endregion
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // #region agent log
    await logToFile({
      location: 'api/chat/message/read/route.ts:63',
      message: 'POST /api/chat/message/read: error caught',
      data: {
        error: error instanceof Error ? error.message : String(error),
        errorType:
          error instanceof ChatValidationError
            ? 'ChatValidationError'
            : error instanceof ChatUpdateError
              ? 'ChatUpdateError'
              : 'Unknown',
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B',
    });
    // #endregion
    // 7. Service 에러 매핑

    // 7-1. ChatValidationError → 400
    if (error instanceof ChatValidationError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    // 7-2. ChatUpdateError → 500
    if (error instanceof ChatUpdateError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 500 }
      );
    }

    // 7-3. 기타 예상치 못한 에러 → 500 (fallback)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

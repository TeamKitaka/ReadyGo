import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createGameStartLogService } from '@/services/gameStartLog/createGameStartLogService';
import {
  GameStartLogCreateError,
  GameStartLogValidationError,
} from '@/commons/errors/gameStartLog/gameStartLogErrors';

/**
 * POST /api/game-start-log/create
 *
 * 책임:
 * - 인증 확인
 * - 요청 검증
 * - Service 호출
 * - 응답 반환
 */

// ============================================
// Validation Schema
// ============================================

const CreateGameStartLogSchema = z
  .object({
    context_type: z.enum(['chat', 'party']),
    context_id: z
      .string()
      .min(1, 'context_id는 비어있지 않은 문자열이어야 합니다.'),
    game_id: z.string().optional().nullable(),
    game_name: z.string().optional().nullable(),
    actor_id: z.undefined().optional(),
  })
  .strict()
  .refine((data) => !('actor_id' in data) || data.actor_id === undefined, {
    message: 'actor_id is not allowed',
    path: ['actor_id'],
  });

// ============================================
// Route Handler
// ============================================

export const POST = async (request: NextRequest) => {
  try {
    // server.ts의 createClient 사용 (SSR 쿠키 자동 관리)
    const supabase = createClient();

    // 사용자 정보 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          message: 'Unauthorized',
          detail: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // 요청 Body 파싱
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          message: 'Invalid JSON',
          detail: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    // actor_id 체크 (body에 포함된 경우 즉시 거부)
    if (body && typeof body === 'object' && 'actor_id' in body) {
      return NextResponse.json(
        {
          message: 'Bad Request',
          detail: 'actor_id is not allowed in request body',
        },
        { status: 400 }
      );
    }

    // Validation
    const validationResult = CreateGameStartLogSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return NextResponse.json(
        {
          message: 'Validation failed',
          detail: errorMessages,
        },
        { status: 400 }
      );
    }

    const {
      context_type: contextType,
      context_id: contextId,
      game_id: gameId,
      game_name: gameName,
    } = validationResult.data;
    const actorId = user.id;

    // 빈 문자열을 null로 변환
    const normalizedGameId =
      gameId && gameId.trim() !== '' ? gameId.trim() : null;
    const normalizedGameName =
      gameName && gameName.trim() !== '' ? gameName.trim() : null;

    // 환경 변수 확인 (디버깅용)
    // eslint-disable-next-line no-console
    const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    // eslint-disable-next-line no-console
    console.log('[API] Environment check:', {
      hasServiceRoleKey,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
    });

    // Service 호출
    const log = await createGameStartLogService({
      actor_id: actorId,
      context_type: contextType,
      context_id: contextId,
      game_id: normalizedGameId,
      game_name: normalizedGameName,
    });

    return NextResponse.json(
      {
        message: 'Game start log created successfully',
        data: log,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error creating game start log:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // GameStartLogValidationError → 400
    if (error instanceof GameStartLogValidationError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    // GameStartLogCreateError → 500
    if (error instanceof GameStartLogCreateError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
          detail: error.originalError,
        },
        { status: 500 }
      );
    }

    // 기타 예상치 못한 에러 → 500 (fallback)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        message: 'Internal Server Error',
        detail: errorMessage,
        error: error instanceof Error ? error.toString() : String(error),
      },
      { status: 500 }
    );
  }
};

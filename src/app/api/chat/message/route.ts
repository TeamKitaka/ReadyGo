import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getChatMessagesService } from '@/services/chat/getChatMessagesService';
import { sendMessageService } from '@/services/chat/sendMessageService';
import {
  ChatFetchError,
  ChatCreateError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/chat/message
 *
 * 책임:
 * - 인증 확인 (supabase.auth.getUser)
 * - 쿼리 파라미터 파싱 (roomId, limit, offset)
 * - getChatMessagesService 호출
 * - Service 에러를 HTTP 상태 코드로 매핑
 *
 * 비책임:
 * - Service 로직 재구현 금지
 */
export const GET = async (request: NextRequest) => {
  try {
    // 1. 인증된 클라이언트 생성
    const supabase = createClient();
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

    // 3. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const roomIdParam = searchParams.get('roomId');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    if (!roomIdParam) {
      return NextResponse.json(
        {
          code: 'CHAT_VALIDATION_ERROR',
          message: 'roomId는 필수입니다.',
        },
        { status: 400 }
      );
    }

    const roomId = parseInt(roomIdParam, 10);
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // 4. Service 호출
    const messages = await getChatMessagesService(
      supabase,
      roomId,
      user.id,
      limit,
      offset
    );

    // 5. 정상 응답
    return NextResponse.json({ data: messages }, { status: 200 });
  } catch (error) {
    // 6. Service 에러 매핑

    // 6-1. ChatValidationError → 400
    if (error instanceof ChatValidationError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    // 6-2. ChatFetchError → 500
    if (error instanceof ChatFetchError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 500 }
      );
    }

    // 6-3. 기타 예상치 못한 에러 → 500 (fallback)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

/**
 * POST /api/chat/message
 *
 * 책임:
 * - 인증 확인 (supabase.auth.getUser)
 * - userId는 auth.uid()에서만 추출
 * - 요청 본문 파싱 (roomId, content, contentType)
 * - sendMessageService 호출
 * - Service 에러를 HTTP 상태 코드로 매핑
 *
 * 비책임:
 * - Service 로직 재구현 금지
 */
export const POST = async (request: NextRequest) => {
  try {
    // 1. 인증된 클라이언트 생성
    const supabase = createClient();
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

    // 3. userId는 auth.uid()에서만 추출
    const userId = user.id;

    // 4. 요청 본문 파싱
    const body = await request.json();
    const { roomId, content, contentType = 'text' } = body;

    // 5. Service 호출
    const savedMessage = await sendMessageService(
      supabase,
      roomId,
      userId,
      content,
      contentType
    );

    // 6. 정상 응답
    return NextResponse.json({ data: savedMessage }, { status: 201 });
  } catch (error) {
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

    // 7-2. ChatCreateError → 500
    if (error instanceof ChatCreateError) {
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

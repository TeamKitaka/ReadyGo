import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPartyMessagesService } from '@/services/party/getPartyMessagesService';
import { sendPartyMessageService } from '@/services/party/sendPartyMessageService';
import {
  ChatFetchError,
  ChatCreateError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/party/[id]/messages
 *
 * 책임:
 * - 인증 확인 (supabase.auth.getUser)
 * - 파라미터 검증 (params.id)
 * - 쿼리 파라미터 파싱 (limit, offset)
 * - 파티 존재 확인
 * - 권한 확인 (파티 멤버 또는 작성자)
 * - getPartyMessagesService 호출
 * - Service 에러를 HTTP 상태 코드로 매핑
 *
 * 비책임:
 * - Service 로직 재구현 금지
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    // 1. 인증 확인
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

    // 2. 파라미터 검증
    const postId = parseInt(params.id, 10);
    if (isNaN(postId)) {
      return NextResponse.json(
        {
          code: 'CHAT_VALIDATION_ERROR',
          message: '유효하지 않은 파티 ID입니다.',
        },
        { status: 400 }
      );
    }

    // 3. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    let limit = limitParam ? parseInt(limitParam, 10) : 50;
    let offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // limit 유효성 검증: 최소 1, 최대 100
    if (isNaN(limit) || limit < 1 || limit > 100) {
      limit = 50;
    }

    // offset 유효성 검증: 최소 0
    if (isNaN(offset) || offset < 0) {
      offset = 0;
    }

    // 4. 파티 존재 확인
    const { data: partyData, error: fetchError } = await supabase
      .from('party_posts')
      .select('id, creator_id')
      .eq('id', postId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '파티를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 5. 권한 확인
    // 작성자인지 확인
    const isCreator = partyData.creator_id === user.id;

    // 작성자가 아닌 경우, 멤버인지 확인
    if (!isCreator) {
      const { data: memberData, error: memberError } = await supabase
        .from('party_members')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (memberError || !memberData) {
        return NextResponse.json(
          { error: '파티 멤버만 메시지를 조회할 수 있습니다.' },
          { status: 403 }
        );
      }
    }

    // 6. Service 호출
    const messages = await getPartyMessagesService(postId, limit, offset);

    // 7. 성공 응답
    return NextResponse.json({ data: messages }, { status: 200 });
  } catch (error) {
    // 8. Service 에러 매핑

    // 8-1. ChatValidationError → 400
    if (error instanceof ChatValidationError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    // 8-2. ChatFetchError → 500
    if (error instanceof ChatFetchError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 500 }
      );
    }

    // 8-3. 기타 예상치 못한 에러 → 500 (fallback)
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
 * POST /api/party/[id]/messages
 *
 * 책임:
 * - 인증 확인 (supabase.auth.getUser)
 * - 파라미터 검증 (params.id)
 * - 요청 본문 파싱 (content)
 * - 파티 존재 확인
 * - 권한 확인 (파티 멤버 또는 작성자)
 * - sendPartyMessageService 호출
 * - Service 에러를 HTTP 상태 코드로 매핑
 *
 * 비책임:
 * - Service 로직 재구현 금지
 */
export const POST = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    // 1. 인증 확인
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

    // 2. 파라미터 검증
    const postId = parseInt(params.id, 10);
    if (isNaN(postId)) {
      return NextResponse.json(
        {
          code: 'CHAT_VALIDATION_ERROR',
          message: '유효하지 않은 파티 ID입니다.',
        },
        { status: 400 }
      );
    }

    // 3. 요청 본문 파싱
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          code: 'CHAT_VALIDATION_ERROR',
          message: '요청 본문이 올바르지 않습니다.',
        },
        { status: 400 }
      );
    }

    const { content, contentType } = body;

    // 4. 파티 존재 확인
    const { data: partyData, error: fetchError } = await supabase
      .from('party_posts')
      .select('id, creator_id')
      .eq('id', postId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '파티를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 5. 권한 확인
    // 작성자인지 확인
    const isCreator = partyData.creator_id === user.id;

    // 작성자가 아닌 경우, 멤버인지 확인
    if (!isCreator) {
      const { data: memberData, error: memberError } = await supabase
        .from('party_members')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (memberError || !memberData) {
        return NextResponse.json(
          { error: '파티 멤버만 메시지를 전송할 수 있습니다.' },
          { status: 403 }
        );
      }
    }

    // 6. Service 호출
    const savedMessage = await sendPartyMessageService(
      postId,
      user.id,
      content,
      contentType || 'text'
    );

    // 7. 성공 응답
    return NextResponse.json({ data: savedMessage }, { status: 201 });
  } catch (error) {
    // 8. Service 에러 매핑

    // 8-1. ChatValidationError → 400
    if (error instanceof ChatValidationError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    // 8-2. ChatCreateError → 500
    if (error instanceof ChatCreateError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 500 }
      );
    }

    // 8-3. 기타 예상치 못한 에러 → 500 (fallback)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

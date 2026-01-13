import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rejectFriendRequest } from '@/services/friends/rejectFriendRequest.service';

/**
 * 친구 요청 거절 API
 * POST /api/friends/reject
 * Body: { request_id: number }
 */
export const POST = async (request: NextRequest) => {
  try {
    // Supabase SSR 클라이언트 생성
    const supabase = createClient();

    // 인증 체크
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // Body 파싱
    const body = await request.json();
    const requestId = body.request_id;

    if (!requestId || typeof requestId !== 'number') {
      return NextResponse.json(
        { error: 'request_id는 숫자여야 합니다.' },
        { status: 400 }
      );
    }

    // Service 호출
    await rejectFriendRequest(supabase, {
      requestId,
      currentUserId: user.id,
    });

    return NextResponse.json(
      { success: true, message: '친구 요청이 거절되었습니다.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/friends/reject] Error:', error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : '알 수 없는 오류가 발생했습니다.';

    // 에러 타입에 따라 상태 코드 결정
    if (errorMessage.includes('not found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }
    if (errorMessage.includes('Unauthorized')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    if (errorMessage.includes('already been processed')) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};

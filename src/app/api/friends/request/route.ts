import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendFriendRequest } from '@/services/friends/sendFriendRequest.service';

/**
 * 친구 요청 보내기 API
 * POST /api/friends/request
 * Body: { receiver_id: string }
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
    const receiverId = body.receiver_id;

    if (!receiverId || typeof receiverId !== 'string') {
      return NextResponse.json(
        { error: 'receiver_id는 문자열이어야 합니다.' },
        { status: 400 }
      );
    }

    // Service 호출
    const friendRequest = await sendFriendRequest(supabase, {
      senderId: user.id,
      receiverId,
    });

    return NextResponse.json(
      {
        success: true,
        message: '친구 요청이 전송되었습니다.',
        data: friendRequest,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/friends/request] Error:', error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : '알 수 없는 오류가 발생했습니다.';

    // 에러 타입에 따라 상태 코드 결정
    if (errorMessage.includes('yourself')) {
      return NextResponse.json(
        { error: '본인에게 친구 요청을 보낼 수 없습니다.' },
        { status: 400 }
      );
    }
    if (errorMessage.includes('Already friends')) {
      return NextResponse.json(
        { error: '이미 친구로 등록된 사용자입니다.' },
        { status: 400 }
      );
    }
    if (
      errorMessage.includes('already sent') ||
      errorMessage.includes('already received')
    ) {
      return NextResponse.json(
        { error: '이미 친구 요청이 전송되었습니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};

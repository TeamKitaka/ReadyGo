import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateMyProfileService } from '@/services/profile/updateMyProfileService';

/**
 * PATCH /api/profile/me/nickname
 *
 * 책임:
 * - 인증 확인
 * - 요청 body 파싱
 * - 닉네임/아바타 service 호출 및 응답 반환
 */
export const PATCH = async (request: NextRequest) => {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const nickname =
      typeof body?.nickname === 'string' ? body.nickname : undefined;
    const avatarUrl =
      typeof body?.avatarUrl === 'string' ? body.avatarUrl : undefined;

    if (!nickname) {
      return NextResponse.json(
        { error: 'nickname은 필수입니다.' },
        { status: 400 }
      );
    }

    const data = await updateMyProfileService(supabase, user.id, {
      nickname,
      avatarUrl,
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '닉네임 업데이트에 실패했습니다.';
    const status =
      message.includes('닉네임은 비어 있을 수 없습니다.') ||
      message.includes('닉네임은 최대') ||
      message.includes('유효하지 않은 아바타 경로입니다.')
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
};

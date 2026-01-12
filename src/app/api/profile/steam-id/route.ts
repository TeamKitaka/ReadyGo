import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSteamId } from '@/repositories/userProfiles.repository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile/steam-id
 *
 * 책임:
 * - 인증 확인 (supabase.auth.getUser)
 * - 현재 사용자의 steam_id 조회
 * - steam_id만 반환
 */
export const GET = async (_request: NextRequest) => {
  try {
    // 1. Supabase SSR 클라이언트 생성
    const supabase = createClient();

    // 2. 사용자 인증 확인
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

    // 3. steam_id 조회
    const result = await getSteamId(supabase, user.id);

    if (result.error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch steam_id',
          detail: result.error.message,
        },
        { status: 500 }
      );
    }

    // 4. 정상 응답: steam_id 반환
    return NextResponse.json(
      {
        steam_id: result.data?.steam_id || null,
      },
      { status: 200 }
    );
  } catch (error) {
    // 5. 기타 예상치 못한 에러 → 500
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};


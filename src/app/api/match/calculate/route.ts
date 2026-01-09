import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateMatchResult } from '@/services/match/calculateMatchResult.service';

/**
 * POST /api/match/calculate
 *
 * 특정 viewer와 target 간의 매칭 결과를 계산합니다.
 * 프로필 패널에서 사용 (채팅 페이지 등에서 matchData가 없을 때)
 *
 * @body {string} viewerId - 현재 사용자 ID
 * @body {string} targetUserId - 대상 사용자 ID
 * @returns 매칭 결과 (finalScore, reasons, tags)
 */
export const POST = async (request: Request) => {
  try {
    // 1. 서버 사이드 Supabase 클라이언트 생성
    const supabase = createClient();

    // 2. 현재 로그인한 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Request body 파싱
    const body = await request.json();
    const { viewerId, targetUserId } = body;

    // 4. 파라미터 검증
    if (!viewerId || !targetUserId) {
      return NextResponse.json(
        { error: 'viewerId and targetUserId are required' },
        { status: 400 }
      );
    }

    // 5. 권한 확인 (viewerId는 현재 로그인한 사용자여야 함)
    if (viewerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 6. 매칭 결과 계산
    const result = await calculateMatchResult(supabase, viewerId, targetUserId);

    // 7. 결과 반환
    return NextResponse.json({
      finalScore: result.finalScore,
      reasons: result.reasons,
      tags: result.tags,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API] Error calculating match:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};


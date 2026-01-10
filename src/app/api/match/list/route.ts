/**
 * Match List API Route
 *
 * GET /api/match/list
 * 매칭 화면용 매칭 목록 조회 API
 *
 * Query Parameters:
 * - minScore: 최소 매칭 점수 (기본값: 65, 중간 매칭율)
 * - status: 상태 필터 ('all' | 'online' | 'offline', 기본값: 'all')
 * - refresh: 강제 새로고침 ('true' | 'false', 기본값: 'false')
 *
 * Response:
 * - results: 매칭 결과 목록 (최대 12개, 점수대별 샘플링)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getMatchList } from '@/services/match/getMatchList.service';

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const minScore = parseInt(searchParams.get('minScore') || '75', 10); // 기본값: 75% (높은 매칭율)
    const statusFilter =
      (searchParams.get('status') as 'all' | 'online' | 'offline') || 'all';
    const refresh = searchParams.get('refresh') === 'true';

    // 인증 확인용 클라이언트
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 매칭 계산은 Admin 클라이언트 사용 (RLS 우회, 모든 유저 데이터 접근)
    const results = await getMatchList(supabaseAdmin, user.id, {
      minScore,
      statusFilter,
      limit: 12,
      refresh, // 캐시 스킵 플래그
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[API /match/list] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

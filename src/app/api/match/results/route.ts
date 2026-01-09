import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHomeMatches } from '@/services/match/getHomeMatches.service';

/**
 * GET /api/match/results
 *
 * 홈 화면용 매칭 결과를 조회합니다.
 * Step 1: 캐시 우선 조회 + 실시간 fallback
 * 
 * 전략:
 * - 캐시에 4개 이상 있으면 즉시 반환 (~50ms)
 * - 부족하면 실시간 계산으로 보충 (~300ms)
 * - 계산 결과는 캐시에 저장 (다음 요청을 위해)
 *
 * @returns 매칭 결과 배열 (프로필 및 상태 정보 포함, 최대 4개)
 */
export const GET = async () => {
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

    // 3. 홈 매칭 결과 조회 (캐시 + fallback)
    const results = await getHomeMatches(supabase, user.id);

    // 4. 결과 반환
    return NextResponse.json({ results });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API] Error fetching home matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

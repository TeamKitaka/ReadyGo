import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHomePartiesService } from '@/services/party/getHomePartiesService';

/**
 * 홈 화면용 파티 목록 조회 API
 * GET /api/home/parties
 *
 * 📌 기능:
 * - 시작 시간이 임박하고 인원 미달인 파티 최대 6개 반환
 * - 현재 사용자가 참여하지 않은 파티만 필터링
 * - 시작 시간이 가장 빠른 순으로 정렬
 */
export const GET = async (_request: NextRequest) => {
  try {
    // 1. 서버 사이드 Supabase 클라이언트 생성 (RLS 적용)
    const supabase = createClient();

    // 2. 현재 로그인한 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', parties: [] },
        { status: 401 }
      );
    }

    // 3. Service 호출하여 파티 목록 조회 (Repository 활용)
    const parties = await getHomePartiesService(user.id);

    // 4. 성공 응답
    return NextResponse.json({
      success: true,
      parties,
      count: parties.length,
    });
  } catch (error) {
    console.error('[API /api/home/parties] Error:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        parties: [],
      },
      { status: 500 }
    );
  }
};

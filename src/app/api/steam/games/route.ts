import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/steam/games
 *
 * 책임:
 * - 인증 확인 (supabase.auth.getUser)
 * - steam_game_info 테이블에서 게임 목록 조회 (RLS 정책: authenticated만 SELECT 가능)
 * - 검색어가 있으면 서버 측에서 필터링 (효율적, 1000개 제한 우회 가능)
 * - SelectboxItem 형식으로 변환하여 반환
 *
 * Query Parameters:
 * - search?: string - 게임 이름 검색어 (선택)
 * - limit?: number - 최대 반환 개수 (기본값: 1000, 최대: 1000)
 *
 * 비책임:
 * - UI 가공, ViewModel 변환 금지
 */
export const GET = async (request: NextRequest) => {
  try {
    // 1. Supabase SSR 클라이언트 생성 (쿠키 자동 관리, 토큰 자동 갱신)
    const supabase = createClient();

    // 2. 사용자 인증 확인 (RLS 정책: authenticated만 SELECT 가능)
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
    const searchQuery = searchParams.get('search')?.trim() || '';
    const limitParam = searchParams.get('limit');
    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10)), 1000)
      : 1000;

    // 4. steam_game_info에서 게임 목록 조회 (인증된 사용자만 가능)
    let query = supabase
      .from('steam_game_info')
      .select('app_id, name')
      .not('name', 'is', null);

    // 검색어가 있으면 서버 측에서 필터링 (ilike는 대소문자 구분 없이 검색)
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    // 정렬 및 limit 적용
    query = query.order('name', { ascending: true }).limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('게임 목록 조회 실패:', error);
      return NextResponse.json(
        {
          code: 'GAMES_FETCH_ERROR',
          message: 'Internal Server Error',
          detail: 'Failed to fetch games',
        },
        { status: 500 }
      );
    }

    // SelectboxItem 형식으로 변환
    const games = (data || [])
      .filter((game) => game.name) // null 체크
      .map((game) => ({
        id: game.app_id.toString(),
        value: game.name!,
      }));

    // 정상 응답 (빈 배열도 유효한 응답)
    return NextResponse.json({ data: games }, { status: 200 });
  } catch (error) {
    console.error('게임 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Internal Server Error',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

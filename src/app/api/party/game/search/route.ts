import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/party/game/search
 *
 * 책임:
 * - 인증 확인
 * - 쿼리 파라미터에서 game_title 받기
 * - steam_game_info 테이블에서 game_title로 app_id 검색 (부분 일치)
 * - 검색 결과 반환
 *
 * 비책임:
 * - 게임 정보 상세 조회
 */
export const GET = async (request: NextRequest) => {
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

    // 2. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const gameTitle = searchParams.get('game_title');

    if (!gameTitle || gameTitle.trim().length === 0) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'game_title 파라미터가 필요합니다.',
        },
        { status: 400 }
      );
    }

    // 3. steam_game_info에서 게임 검색
    // 부분 일치 검색을 위해 모든 게임 정보를 조회하고 메모리에서 매칭
    const { data: allGameInfos, error: gameError } = await supabase
      .from('steam_game_info')
      .select('app_id, name')
      .not('name', 'is', null);

    if (gameError) {
      console.error('steam_game_info 조회 실패:', gameError);
      return NextResponse.json(
        {
          code: 'DATABASE_ERROR',
          message: '게임 정보를 조회하는 중 오류가 발생했습니다.',
        },
        { status: 500 }
      );
    }

    // 4. 게임 검색: 정확한 일치 우선, 그 다음 부분 일치
    const gameTitleTrimmed = gameTitle.trim();
    const gameTitleLower = gameTitleTrimmed.toLowerCase();

    // 4-1. 정확한 일치 검색 (대소문자 무시)
    let matchedGame = allGameInfos?.find((gameInfo) => {
      if (!gameInfo.name) {
        return false;
      }
      return gameInfo.name.toLowerCase() === gameTitleLower;
    });

    // 4-2. 정확한 일치가 없으면 부분 일치 검색
    if (!matchedGame) {
      matchedGame = allGameInfos?.find((gameInfo) => {
        if (!gameInfo.name) {
          return false;
        }
        const gameNameLower = gameInfo.name.toLowerCase();
        // 부분 일치: 양방향 검사
        return (
          gameNameLower.includes(gameTitleLower) ||
          gameTitleLower.includes(gameNameLower)
        );
      });
    }

    // 5. 검색 결과 반환
    if (!matchedGame) {
      console.log(
        `[게임 검색] 게임을 찾을 수 없음: "${gameTitleTrimmed}" (총 ${allGameInfos?.length || 0}개 게임 검색됨)`
      );
      return NextResponse.json(
        {
          data: null,
        },
        { status: 200 }
      );
    }

    console.log(
      `[게임 검색] 매칭 성공: "${gameTitleTrimmed}" -> "${matchedGame.name}" (app_id: ${matchedGame.app_id})`
    );

    return NextResponse.json(
      {
        data: {
          app_id: matchedGame.app_id,
          name: matchedGame.name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('게임 검색 중 오류 발생:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

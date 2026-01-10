import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { syncSteamGames } from '@/services/steam/syncSteamGames.service';
import * as matchCacheRepo from '@/repositories/matchResultsCache.repository';

/**
 * POST /api/steam/sync
 *
 * 책임:
 * - 인증 확인
 * - body에 userId 포함 시 거부
 * - Service 호출
 * - 응답 반환
 *
 * 비책임:
 * - 비즈니스 로직
 * - 데이터 매핑
 * - 로그 기록 (Service 책임)
 */

export const POST = async (request: NextRequest) => {
  try {
    // 1. Supabase 클라이언트 생성 (SSR 쿠키 기반)
    const supabase = createClient();

    // 2. 인증 확인
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

    // 3. body 파싱 및 userId 포함 여부 확인
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      // body가 없거나 JSON이 아닌 경우 무시 (POST이지만 body 불필요)
      body = null;
    }

    // 4. body에 userId 포함 시 즉시 거부
    if (body && typeof body === 'object' && 'userId' in body) {
      return NextResponse.json(
        {
          message: 'Bad Request',
          detail: 'userId is not allowed in request body',
        },
        { status: 400 }
      );
    }

    // 5. Service 호출 (viewerId는 auth에서만 획득)
    const result = await syncSteamGames(supabase, user.id);

    // 6. 캐시 무효화 (Steam 데이터 변경 시, 성공한 경우만)
    if (result.status === 'success') {
      try {
        await matchCacheRepo.deleteAllByViewer(supabaseAdmin, user.id);
      } catch (cacheError) {
        // 캐시 삭제 실패는 치명적이지 않으므로 로그만 남김
        console.error(
          '[POST /api/steam/sync] Cache invalidation failed:',
          cacheError
        );
      }
    }

    // 7. 성공 응답 (Service는 throw하지 않으므로 항상 200 OK)
    return NextResponse.json(
      {
        status: result.status,
        syncedGamesCount: result.syncedGamesCount,
      },
      { status: 200 }
    );
  } catch (error) {
    // 8. 예외 처리 (Repository 인프라 오류 등)
    console.error('[POST /api/steam/sync] Error:', error);
    return NextResponse.json(
      {
        message: 'Internal Server Error',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

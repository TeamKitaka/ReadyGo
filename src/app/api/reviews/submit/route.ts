import { NextRequest, NextResponse } from 'next/server';
import { submitReviewWithTemperatureAndTier } from '@/services/reviews/submitReviewWithTemperatureAndTier.service';
import { createClient } from '@/lib/supabase/server';
import {
  ReviewValidationError,
  ReviewCreateError,
} from '@/commons/errors/reviews/reviewsErrors';

export const dynamic = 'force-dynamic';

/**
 * 리뷰 제출 API
 * POST /api/reviews/submit
 *
 * 요청 body:
 * {
 *   targetUserId: string;
 *   scoreManner: number; // 0-2
 *   scoreTeamwork: number; // 0-1
 *   scoreCommunication: number; // 0-2
 *   comment?: string | null;
 * }
 */
export async function POST(request: NextRequest) {
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

    const reviewerId = user.id;

    // 2. 요청 body 파싱
    const body = await request.json();
    const { targetUserId, scoreManner, scoreTeamwork, scoreCommunication, comment } = body;

    // 3. 입력 검증
    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json(
        { error: 'targetUserId는 필수입니다.' },
        { status: 400 }
      );
    }

    if (targetUserId === reviewerId) {
      return NextResponse.json(
        { error: '자기 자신에게 리뷰를 작성할 수 없습니다.' },
        { status: 400 }
      );
    }

    if (
      typeof scoreManner !== 'number' ||
      scoreManner < 0 ||
      scoreManner > 2 ||
      !Number.isInteger(scoreManner)
    ) {
      return NextResponse.json(
        { error: 'scoreManner는 0 이상 2 이하의 정수여야 합니다.' },
        { status: 400 }
      );
    }

    if (
      typeof scoreTeamwork !== 'number' ||
      scoreTeamwork < 0 ||
      scoreTeamwork > 1 ||
      !Number.isInteger(scoreTeamwork)
    ) {
      return NextResponse.json(
        { error: 'scoreTeamwork는 0 이상 1 이하의 정수여야 합니다.' },
        { status: 400 }
      );
    }

    if (
      typeof scoreCommunication !== 'number' ||
      scoreCommunication < 0 ||
      scoreCommunication > 2 ||
      !Number.isInteger(scoreCommunication)
    ) {
      return NextResponse.json(
        { error: 'scoreCommunication은 0 이상 2 이하의 정수여야 합니다.' },
        { status: 400 }
      );
    }

    if (comment !== undefined && comment !== null && typeof comment !== 'string') {
      return NextResponse.json(
        { error: 'comment는 문자열이어야 합니다.' },
        { status: 400 }
      );
    }

    // 4. 리뷰 제출 및 온도/티어 업데이트
    const result = await submitReviewWithTemperatureAndTier(
      {
        targetUserId,
        scoreManner,
        scoreTeamwork,
        scoreCommunication,
        comment: comment || null,
      },
      reviewerId
    );

    // 5. 결과 반환
    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to submit review:', error);

    // ReviewValidationError → 400
    if (error instanceof ReviewValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // ReviewCreateError → 500
    if (error instanceof ReviewCreateError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // 기타 에러 → 500
    const errorMessage =
      error instanceof Error ? error.message : '후기 제출에 실패했습니다.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

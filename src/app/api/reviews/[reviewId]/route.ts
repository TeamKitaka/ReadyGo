import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getReviewByIdService } from '@/services/reviews/getReviewByIdService';
import {
  ReviewNotFoundError,
  ReviewValidationError,
  ReviewFetchError,
} from '@/commons/errors/reviews/reviewsErrors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews/[reviewId]
 *
 * 책임:
 * - 인증 확인 (supabase.auth.getUser)
 * - params.reviewId 추출 및 존재 여부 검증
 * - 권한 체크 (본인이 받은 후기만 조회 가능)
 * - getReviewByIdService 호출
 * - Service 에러를 HTTP 상태 코드로 매핑
 * - 응답 데이터는 Service 반환값 그대로 전달
 *
 * 비책임:
 * - Service 로직 재구현 금지
 * - UI 가공, ViewModel 변환 금지
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) => {
  try {
    // 1. Supabase SSR 클라이언트 생성 (쿠키 자동 관리, 토큰 자동 갱신)
    const supabase = createClient();

    // 2. 사용자 인증 확인 (토큰 갱신은 자동으로 처리됨)
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

    // 3. reviewId 파라미터 추출 및 존재 여부 검증
    const reviewIdParam = params.reviewId;

    if (!reviewIdParam) {
      return NextResponse.json(
        {
          message: 'Bad Request',
          detail: 'reviewId parameter is required',
        },
        { status: 400 }
      );
    }

    // 4. reviewId를 숫자로 변환
    const reviewId = parseInt(reviewIdParam, 10);
    if (isNaN(reviewId) || reviewId <= 0) {
      return NextResponse.json(
        {
          message: 'Bad Request',
          detail: 'reviewId must be a positive number',
        },
        { status: 400 }
      );
    }

    // 5. Service 호출하여 후기 조회
    const review = await getReviewByIdService(reviewId);

    // 6. 권한 체크: 본인이 받은 후기만 조회 가능
    if (review.target_user_id !== user.id) {
      return NextResponse.json(
        {
          message: 'Forbidden',
          detail: 'You can only view reviews you received',
        },
        { status: 403 }
      );
    }

    // 7. 정상 응답: Review 데이터 그대로 반환
    return NextResponse.json(review, { status: 200 });
  } catch (error) {
    // 8. Service 에러 매핑

    // 8-1. ReviewNotFoundError → 404
    if (error instanceof ReviewNotFoundError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 404 }
      );
    }

    // 8-2. ReviewValidationError → 400
    if (error instanceof ReviewValidationError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    // 8-3. ReviewFetchError → 500
    if (error instanceof ReviewFetchError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 500 }
      );
    }

    // 8-4. 기타 예상치 못한 에러 → 500 (fallback)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

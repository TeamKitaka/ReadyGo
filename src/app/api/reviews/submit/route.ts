import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { submitReview } from '@/services/reviews/submitReviewService';

/**
 * POST /api/reviews/submit
 *
 * 책임:
 * - 인증 확인
 * - 요청 검증
 * - Service 호출
 * - 응답 반환
 */

// ============================================
// Validation Schema
// ============================================

const ReviewAnswersSchema = z.object({
  manner: z.tuple([z.boolean(), z.boolean()]),
  teamwork: z.tuple([z.boolean()]),
  communication: z.tuple([z.boolean(), z.boolean()]),
  comment: z.string().optional(),
});

const SubmitReviewSchema = z
  .object({
    targetUserId: z.string().uuid('Invalid targetUserId format'),
    answers: ReviewAnswersSchema,
    reviewRequestId: z.number().int().positive().optional(),
    reviewerId: z.undefined().optional(),
  })
  .strict()
  .refine((data) => !('reviewerId' in data) || data.reviewerId === undefined, {
    message: 'reviewerId is not allowed',
    path: ['reviewerId'],
  });

// ============================================
// Route Handler
// ============================================

export const POST = async (request: NextRequest) => {
  try {
    // server.ts의 createClient 사용 (SSR 쿠키 자동 관리)
    const supabase = createClient();

    // 사용자 정보 확인
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

    // 요청 Body 파싱
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          message: 'Invalid JSON',
          detail: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    // reviewerId 체크 (body에 포함된 경우 즉시 거부)
    if (body && typeof body === 'object' && 'reviewerId' in body) {
      return NextResponse.json(
        {
          message: 'Bad Request',
          detail: 'reviewerId is not allowed in request body',
        },
        { status: 400 }
      );
    }

    // Validation
    const validationResult = SubmitReviewSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return NextResponse.json(
        {
          message: 'Validation failed',
          detail: errorMessages,
        },
        { status: 400 }
      );
    }

    const { targetUserId, answers, reviewRequestId } = validationResult.data;
    const reviewerId = user.id;

    // Service 호출
    const review = await submitReview(
      reviewerId,
      targetUserId,
      answers,
      reviewRequestId
    );

    return NextResponse.json(
      {
        message: 'Review submitted successfully',
        data: review,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting review:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to submit review';

    return NextResponse.json(
      {
        message: 'Internal Server Error',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
};

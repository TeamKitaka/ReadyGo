import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AnimalType } from '@/commons/constants/animal/animal.enum';
import { TraitKey } from '@/commons/constants/animal/trait.enum';
import {
  DAY_TYPES,
  TIME_SLOTS,
} from '@/components/traits/data/questionSchedule';
import { submitTraits } from '@/services/traits/submitTraits.service';
import * as matchCacheRepo from '@/repositories/matchResultsCache.repository';

/**
 * POST /api/traits/submit
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

const validDayTypeIds = new Set(DAY_TYPES.map((d) => d.id));
const validTimeSlotIds = new Set(TIME_SLOTS.map((t) => t.id));
const validAnimalTypes = new Set(Object.values(AnimalType));
const traitKeys: TraitKey[] = [
  'cooperation',
  'exploration',
  'strategy',
  'leadership',
  'social',
];

const TraitsSchema = z.object({
  cooperation: z.number().min(0).max(100),
  exploration: z.number().min(0).max(100),
  strategy: z.number().min(0).max(100),
  leadership: z.number().min(0).max(100),
  social: z.number().min(0).max(100),
});

const SubmitTraitsSchema = z
  .object({
    traits: TraitsSchema,
    animalType: z
      .string()
      .refine((val) => validAnimalTypes.has(val as AnimalType), {
        message: 'Invalid animalType',
      }),
    dayTypes: z
      .array(z.string())
      .refine((arr) => arr.every((id) => validDayTypeIds.has(id)), {
        message: 'Invalid dayTypes',
      }),
    timeSlots: z
      .array(z.string())
      .refine((arr) => arr.every((id) => validTimeSlotIds.has(id)), {
        message: 'Invalid timeSlots',
      }),
    user_id: z.undefined().optional(),
  })
  .strict()
  .refine((data) => !('user_id' in data) || data.user_id === undefined, {
    message: 'user_id is not allowed',
    path: ['user_id'],
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

    // 4. user_id 체크 (body에 포함된 경우 즉시 거부)
    if (body && typeof body === 'object' && 'user_id' in body) {
      return NextResponse.json(
        {
          message: 'Bad Request',
          detail: 'user_id is not allowed in request body',
        },
        { status: 400 }
      );
    }

    // 5. Validation
    const validationResult = SubmitTraitsSchema.safeParse(body);
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

    const payload = validationResult.data;

    // 6. traits 5개 모두 포함 검증
    for (const key of traitKeys) {
      if (!(key in payload.traits)) {
        return NextResponse.json(
          {
            message: 'Validation failed',
            detail: `Missing trait: ${key}`,
          },
          { status: 400 }
        );
      }
    }

    // 7. Service 호출
    await submitTraits(supabase, user.id, {
      traits: payload.traits,
      animalType: payload.animalType as AnimalType,
      dayTypes: payload.dayTypes,
      timeSlots: payload.timeSlots,
    });

    // 8. 캐시 무효화 (성향 데이터 변경 시)
    try {
      await matchCacheRepo.deleteAllByViewer(supabaseAdmin, user.id);
    } catch (cacheError) {
      // 캐시 삭제 실패는 치명적이지 않으므로 로그만 남김
      console.error(
        '[POST /api/traits/submit] Cache invalidation failed:',
        cacheError
      );
    }

    // 9. 성공 응답
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    // 10. 에러 처리
    console.error('[POST /api/traits/submit] Error:', error);
    return NextResponse.json(
      {
        message: 'Internal Server Error',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

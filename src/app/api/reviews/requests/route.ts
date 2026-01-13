import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/reviews/requests
 *
 * 책임:
 * - 파티/채팅 context 기준으로 내가 작성해야 할 review_requests 조회
 * - 인증 확인
 * - 쿼리 파라미터 검증
 * - review_requests와 user_profiles join하여 반환
 */

export const GET = async (request: NextRequest) => {
  try {
    // Supabase SSR 클라이언트 생성 (쿠키 자동 처리)
    const supabase = createClient();

    // 사용자 정보 확인
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const contextType = searchParams.get('context_type');
    const contextId = searchParams.get('context_id');
    const reviewRequestId = searchParams.get('review_request_id');

    // review_request_id로 단일 조회
    if (reviewRequestId) {
      const reviewRequestIdNumber = parseInt(reviewRequestId, 10);
      if (isNaN(reviewRequestIdNumber)) {
        return NextResponse.json(
          {
            error: '유효하지 않은 review_request_id입니다.',
            detail: 'review_request_id는 숫자여야 합니다.',
          },
          { status: 400 }
        );
      }

      const { data: reviewRequest, error: reviewRequestError } = await supabase
        .from('review_requests')
        .select(
          `
          id,
          context_type,
          context_id,
          target_id,
          actor_id,
          status,
          created_at,
          completed_at
        `
        )
        .eq('id', reviewRequestIdNumber)
        .single();

      if (reviewRequestError) {
        console.error('review_request 조회 실패:', reviewRequestError);
        return NextResponse.json(
          { error: 'review_request 조회에 실패했습니다.' },
          { status: 500 }
        );
      }

      if (!reviewRequest) {
        return NextResponse.json(
          { error: 'review_request를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          data: {
            id: reviewRequest.id,
            context_type: reviewRequest.context_type,
            context_id: reviewRequest.context_id,
            reviewer_id: reviewRequest.target_id,
            target_id: reviewRequest.actor_id,
            status: reviewRequest.status,
            created_at: reviewRequest.created_at,
            completed_at: reviewRequest.completed_at,
          },
        },
        { status: 200 }
      );
    }

    // 필수 파라미터 검증 (review_request_id가 없을 때)
    if (!contextType || !contextId) {
      return NextResponse.json(
        {
          error: '필수 파라미터가 없습니다.',
          detail: 'context_type과 context_id는 필수입니다. (또는 review_request_id)',
        },
        { status: 400 }
      );
    }

    // context_type 검증
    if (contextType !== 'party' && contextType !== 'chat') {
      return NextResponse.json(
        {
          error: '유효하지 않은 context_type입니다.',
          detail: 'context_type은 "party" 또는 "chat"이어야 합니다.',
        },
        { status: 400 }
      );
    }

    // context_id 숫자 변환
    const contextIdNumber = parseInt(contextId, 10);
    if (isNaN(contextIdNumber)) {
      return NextResponse.json(
        {
          error: '유효하지 않은 context_id입니다.',
          detail: 'context_id는 숫자여야 합니다.',
        },
        { status: 400 }
      );
    }

    // review_requests 조회
    // 조건: context_type, context_id, target_id = auth.uid() (내가 후기를 써야 하는 사람들)
    // target_user는 actor_id로 조회 (후기를 받는 사람의 프로필)
    const { data: reviewRequests, error: reviewRequestsError } = await supabase
      .from('review_requests')
      .select(
        `
        id,
        target_id,
        actor_id,
        status,
        created_at,
        completed_at,
        target_user:user_profiles!review_requests_actor_id_fkey(
          id,
          nickname,
          avatar_url,
          animal_type
        )
      `
      )
      .eq('context_type', contextType)
      .eq('context_id', contextIdNumber)
      .eq('target_id', user.id) // 내가 후기를 써야 하는 사람들 (reviewer_id = 나)
      .order('created_at', { ascending: false });

    if (reviewRequestsError) {
      console.error('review_requests 조회 실패:', reviewRequestsError);
      return NextResponse.json(
        { error: 'review_requests 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 응답 데이터 변환 (ViewModel용 alias)
    const data = (reviewRequests || []).map((req) => {
      const targetUser = Array.isArray(req.target_user)
        ? req.target_user[0]
        : req.target_user;

      return {
        id: req.id,
        reviewer_id: req.target_id, // 후기를 쓰는 사람 (나)
        target_id: req.actor_id, // 후기를 받는 사람
        status: req.status as 'pending' | 'completed',
        created_at: req.created_at,
        completed_at: req.completed_at,
        target_user: targetUser
          ? {
              id: targetUser.id,
              nickname: targetUser.nickname || '알 수 없음',
              avatar_url: targetUser.avatar_url,
              animal_type: targetUser.animal_type,
            }
          : null,
      };
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Review requests API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
};

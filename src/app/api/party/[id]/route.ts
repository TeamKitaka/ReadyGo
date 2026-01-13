import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateStartAt } from '@/lib/utils/party';
import { getPartyPost } from '@/repositories/partyPosts.repository';

/**
 * 단일 파티 조회
 * GET /api/party/[id]
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    // Supabase SSR 클라이언트 생성 (쿠키 자동 처리)
    const supabase = createClient();

    // 사용자 정보 확인 (인증 체크)
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

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 파티 ID입니다.' },
        { status: 400 }
      );
    }

    const { data: partyData, error: fetchError } = await supabase
      .from('party_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '파티를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 현재 유저의 party_members role 조회
    const { data: memberData } = await supabase
      .from('party_members')
      .select('role')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .single();

    // 데이터가 없으면 role은 null
    // (에러가 발생해도 파티 데이터는 반환해야 하므로 에러는 무시)
    const currentUserRole = memberData?.role || null;

    return NextResponse.json({
      data: partyData,
      currentUserRole,
    });
  } catch (error) {
    console.error('Party detail API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
};

/**
 * 파티 삭제
 * DELETE /api/party/[id]
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    // Supabase SSR 클라이언트 생성 (쿠키 자동 처리)
    const supabase = createClient();

    // 사용자 정보 확인 (session/route.ts와 동일한 패턴)
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

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 파티 ID입니다.' },
        { status: 400 }
      );
    }

    // 파티 존재 및 권한 확인
    const { data: partyData, error: fetchError } = await supabase
      .from('party_posts')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '파티를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 생성자만 삭제 가능
    if (partyData.creator_id !== user.id) {
      return NextResponse.json(
        { error: '삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 파티 삭제
    const { error: deleteError } = await supabase
      .from('party_posts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Party delete API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
};

/**
 * 파티 수정
 * PATCH /api/party/[id]
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    // Supabase SSR 클라이언트 생성 (쿠키 자동 처리)
    const supabase = createClient();

    // 사용자 정보 확인 (session/route.ts와 동일한 패턴)
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

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 파티 ID입니다.' },
        { status: 400 }
      );
    }

    // 파티 존재 및 권한 확인
    const { data: partyData, error: fetchError } = await supabase
      .from('party_posts')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '파티를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 생성자만 수정 가능
    if (partyData.creator_id !== user.id) {
      return NextResponse.json(
        { error: '수정 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // 전달된 필드만 업데이트
    const allowedFields = [
      'game_title',
      'party_title',
      'start_date',
      'start_time',
      'description',
      'max_members',
      'control_level',
      'difficulty',
      'voice_chat',
      'tags',
      'status',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // start_date 또는 start_time이 변경되면 start_at 재계산
    if (body.start_date !== undefined || body.start_time !== undefined) {
      // 기존 데이터 조회
      const existing = await getPartyPost(id);
      if (existing) {
        const finalStartDate = body.start_date ?? existing.start_date;
        const finalStartTime = body.start_time ?? existing.start_time;
        updateData.start_at = calculateStartAt(finalStartDate, finalStartTime);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '수정할 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 파티 수정
    const { data: updatedData, error: updateError } = await supabase
      .from('party_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ data: updatedData });
  } catch (error) {
    console.error('Party update API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
};

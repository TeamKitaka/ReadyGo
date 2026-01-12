import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';
import { sendPartyMessageService } from '@/services/party/sendPartyMessageService';

type PartyMember = Database['public']['Tables']['party_members']['Row'];
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

/**
 * 파티 멤버 조회
 * GET /api/party/[id]/members
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
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

    // 파라미터 검증
    const postId = parseInt(params.id, 10);
    if (isNaN(postId)) {
      return NextResponse.json(
        { error: '유효하지 않은 파티 ID입니다.' },
        { status: 400 }
      );
    }

    // 파티 존재 확인
    const { data: _partyData, error: fetchError } = await supabase
      .from('party_posts')
      .select('id')
      .eq('id', postId)
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

    // party_members 조회
    const { data: partyMembers, error: membersError } = await supabase
      .from('party_members')
      .select('*')
      .eq('post_id', postId)
      .order('joined_at', { ascending: true });

    if (membersError) {
      return NextResponse.json(
        { error: membersError.message },
        { status: 500 }
      );
    }

    const members: PartyMember[] = partyMembers || [];

    // user_profiles 조회: 모든 user_id에 대한 프로필 조회
    const userIds = Array.from(
      new Set(
        members.map((m) => m.user_id).filter((id): id is string => Boolean(id))
      )
    );

    let profiles: UserProfile[] = [];

    if (userIds.length > 0) {
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.error('user_profiles 조회 실패:', profilesError);
        // 프로필 조회 실패해도 멤버 정보는 반환
      } else {
        profiles = userProfiles || [];
      }
    }

    return NextResponse.json({
      members,
      profiles,
    });
  } catch (error) {
    console.error('Party members GET API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
};

/**
 * 파티 참여
 * POST /api/party/[id]/members
 */
export const POST = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
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

    const postId = parseInt(params.id, 10);
    if (isNaN(postId)) {
      return NextResponse.json(
        { error: '유효하지 않은 파티 ID입니다.' },
        { status: 400 }
      );
    }

    // 파티 존재 확인
    const { data: partyData, error: fetchError } = await supabase
      .from('party_posts')
      .select('id, max_members, creator_id')
      .eq('id', postId)
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

    // 작성자는 이미 멤버이므로 중복 참여 방지
    if (partyData.creator_id === user.id) {
      return NextResponse.json(
        { error: '이미 파티의 작성자입니다.' },
        { status: 400 }
      );
    }

    // 이미 참여한 멤버인지 확인
    const { data: existingMember } = await supabase
      .from('party_members')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: '이미 참여한 파티입니다.' },
        { status: 400 }
      );
    }

    // 현재 참여자 수 확인
    const { count: currentMembers, error: countError } = await supabase
      .from('party_members')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // 최대 인원 확인
    if (currentMembers && currentMembers >= partyData.max_members) {
      return NextResponse.json(
        { error: '파티 인원이 가득 찼습니다.' },
        { status: 400 }
      );
    }

    // party_members에 추가
    const { data: insertData, error: insertError } = await supabase
      .from('party_members')
      .insert({
        post_id: postId,
        user_id: user.id,
        role: 'member',
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      // 중복 키 에러 처리 (unique constraint가 있는 경우)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: '이미 참여한 파티입니다.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 멤버 참가 성공 시 시스템 메시지 생성
    try {
      // 사용자 프로필 조회 (닉네임 가져오기)
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('nickname')
        .eq('id', user.id)
        .single();

      const nickname = userProfile?.nickname || '알 수 없는 사용자';
      const systemMessageContent = `${nickname}님이 참가하였습니다`;

      // 시스템 메시지 생성 (sender_id는 null)
      await sendPartyMessageService(
        postId,
        null, // 시스템 메시지는 sender_id가 null
        systemMessageContent,
        'system'
      );
    } catch (messageError) {
      // 시스템 메시지 생성 실패해도 멤버 추가는 성공으로 처리
      // (로그만 남기고 계속 진행)
      console.error('시스템 메시지 생성 실패:', messageError);
    }

    return NextResponse.json({ data: insertData }, { status: 201 });
  } catch (error) {
    console.error('Party join API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
};

/**
 * 파티 나가기
 * DELETE /api/party/[id]/members
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
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

    // 파라미터 검증
    const postId = parseInt(params.id, 10);
    if (isNaN(postId)) {
      return NextResponse.json(
        { error: '유효하지 않은 파티 ID입니다.' },
        { status: 400 }
      );
    }

    // 파티 정보 조회 (creator_id 확인)
    const { data: partyData, error: fetchError } = await supabase
      .from('party_posts')
      .select('creator_id')
      .eq('id', postId)
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

    // 작성자 확인 (파티 작성자는 나갈 수 없음)
    if (partyData.creator_id === user.id) {
      return NextResponse.json(
        { error: '파티 작성자는 나갈 수 없습니다.' },
        { status: 400 }
      );
    }

    // 삭제 전 참여 여부 확인
    const { data: _existingMember, error: checkError } = await supabase
      .from('party_members')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        // 참여하지 않은 경우
        return NextResponse.json(
          { error: '참여하지 않은 파티입니다.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    // party_members 레코드 삭제
    const { data: deletedData, error: deleteError } = await supabase
      .from('party_members')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .select();

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 삭제된 row가 없는 경우
    if (!deletedData || deletedData.length === 0) {
      return NextResponse.json(
        { error: '파티 나가기에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 성공 응답
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Party leave API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
};

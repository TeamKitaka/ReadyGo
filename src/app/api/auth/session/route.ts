import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateUserStatusOffline } from '@/services/auth/updateUserStatusOffline';
import { updateUserStatusOnline } from '@/services/auth/updateUserStatusOnline';

/**
 * 로그인 API (일반 로그인)
 * POST /api/auth/session
 *
 * Supabase SSR 클라이언트를 사용하여:
 * - Supabase 인증 후 토큰을 HttpOnly 쿠키에 자동 저장
 * - 클라이언트에는 최소 정보만 반환
 *
 * 요청 형식:
 * - 일반 로그인: { email, password }
 */
export const POST = async function (request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 일반 로그인 처리
    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Supabase SSR 클라이언트 생성 (쿠키 자동 관리)
    const supabase = createClient();

    // 로그인 시도
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 에러 메시지를 한글로 변환
      let errorMessage = '로그인에 실패했습니다.';
      if (error.message) {
        if (
          error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_grant')
        ) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = '이메일 인증이 완료되지 않았습니다.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
        } else {
          errorMessage = error.message;
        }
      }

      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json(
        { error: '로그인에 실패했습니다. 세션을 받지 못했습니다.' },
        { status: 401 }
      );
    }

    // 로그인 성공 후 user_status를 online으로 업데이트
    if (data.user?.id) {
      await updateUserStatusOnline(data.user.id);
    }

    // 클라이언트에는 최소 정보만 반환 (토큰은 HttpOnly 쿠키에 자동 저장됨)
    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
};

/**
 * 세션 조회 API (토큰 자동 갱신 포함)
 * GET /api/auth/session
 *
 * Supabase SSR 클라이언트를 사용하여:
 * - getUser()로 서버 검증된 사용자 정보 조회 (보안)
 * - getSession()으로 토큰 갱신 처리 (만료 시 자동 갱신)
 * - 갱신된 토큰을 HttpOnly 쿠키에 자동 저장
 */
export const GET = async function () {
  try {
    // Supabase SSR 클라이언트 생성 (쿠키 자동 관리, 토큰 자동 갱신)
    const supabase = createClient();

    // 1. getUser()로 사용자 검증 (보안: 서버에서 직접 검증)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // 2. 토큰 갱신을 위해 getSession() 호출 (토큰 갱신만, user는 사용하지 않음)
    // getUser()는 토큰 갱신을 하지 않지만, getSession()은 만료 시 자동 갱신 시도
    await supabase.auth.getSession();

    // 3. 검증된 user 사용 (getUser()로 서버에서 검증된 안전한 user 객체)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Get session API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
};

/**
 * 로그아웃 API
 * DELETE /api/auth/session
 */
export const DELETE = async function () {
  try {
    // Supabase SSR 클라이언트 생성 (쿠키 자동 관리)
    const supabase = createClient();

    // 사용자 정보 조회 (user_status 업데이트를 위해)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 로그아웃 전에 user_status를 offline으로 업데이트
    if (user?.id) {
      await updateUserStatusOffline(user.id);
    }

    // Supabase 세션 제거 (쿠키도 자동으로 삭제됨)
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout API error:', error);
    // 에러가 발생해도 성공으로 반환 (쿠키는 Supabase가 자동으로 처리)
    return NextResponse.json({ success: true });
  }
};

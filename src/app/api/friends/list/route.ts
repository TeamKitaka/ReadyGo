import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as friendshipRepository from '@/repositories/friendship.repository';
import type { Database } from '@/types/supabase';

type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type UserStatusRow = Database['public']['Tables']['user_status']['Row'];

interface FriendWithProfile {
  user_id: string;
  profile: UserProfileRow | null;
  status: UserStatusRow | null;
}

/**
 * 친구 목록 조회 API
 * GET /api/friends/list
 * friendships 기준으로 친구 목록 반환 (profile, status 포함)
 */
export const GET = async (_request: NextRequest) => {
  try {
    // Supabase SSR 클라이언트 생성
    const supabase = createClient();

    // 인증 체크
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

    // 친구 user_id 목록 조회
    const friendUserIds = await friendshipRepository.getFriendUserIds(
      supabase,
      user.id
    );

    if (friendUserIds.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // 친구들의 profile 조회
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', friendUserIds);

    if (profilesError) {
      console.error(
        '[API /api/friends/list] Error fetching profiles:',
        profilesError
      );
    }

    // 친구들의 status 조회
    const { data: statuses, error: statusesError } = await supabase
      .from('user_status')
      .select('*')
      .in('user_id', friendUserIds);

    if (statusesError) {
      console.error(
        '[API /api/friends/list] Error fetching statuses:',
        statusesError
      );
    }

    // profile과 status를 user_id로 매핑
    const profilesMap = (profiles || []).reduce(
      (acc, profile) => {
        if (profile.id) {
          acc[profile.id] = profile;
        }
        return acc;
      },
      {} as Record<string, UserProfileRow>
    );

    const statusesMap = (statuses || []).reduce(
      (acc, status) => {
        if (status.user_id) {
          acc[status.user_id] = status;
        }
        return acc;
      },
      {} as Record<string, UserStatusRow>
    );

    // 친구 목록 구성
    const friends: FriendWithProfile[] = friendUserIds.map((userId) => ({
      user_id: userId,
      profile: profilesMap[userId] || null,
      status: statusesMap[userId] || null,
    }));

    return NextResponse.json({ data: friends }, { status: 200 });
  } catch (error) {
    console.error('[API /api/friends/list] Error:', error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : '알 수 없는 오류가 발생했습니다.';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};

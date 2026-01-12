import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as friendRequestsRepository from '@/repositories/friendRequests.repository';
import type { Database } from '@/types/supabase';

type FriendRequestRow = Database['public']['Tables']['friend_requests']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

interface FriendRequestWithSender extends FriendRequestRow {
  sender_profile: UserProfileRow | null;
}

/**
 * 친구 요청 목록 조회 API
 * GET /api/friends/requests
 * 내가 받은 pending 요청 목록 반환 (sender profile 포함)
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

    // 내가 받은 pending 요청 목록 조회
    const requests = await friendRequestsRepository.findByReceiver(
      supabase,
      user.id,
      'pending'
    );

    // sender profile 조회
    const senderIds = requests
      .map((req) => req.sender_id)
      .filter((id): id is string => id !== null);

    let senderProfiles: Record<string, UserProfileRow> = {};

    if (senderIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', senderIds);

      if (profilesError) {
        console.error(
          '[API /api/friends/requests] Error fetching profiles:',
          profilesError
        );
      } else {
        senderProfiles = (profiles || []).reduce(
          (acc, profile) => {
            if (profile.id) {
              acc[profile.id] = profile;
            }
            return acc;
          },
          {} as Record<string, UserProfileRow>
        );
      }
    }

    // 요청과 sender profile 결합
    const requestsWithSender: FriendRequestWithSender[] = requests.map(
      (req) => ({
        ...req,
        sender_profile: req.sender_id
          ? senderProfiles[req.sender_id] || null
          : null,
      })
    );

    return NextResponse.json({ data: requestsWithSender }, { status: 200 });
  } catch (error) {
    console.error('[API /api/friends/requests] Error:', error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : '알 수 없는 오류가 발생했습니다.';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};

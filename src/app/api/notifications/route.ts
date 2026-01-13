import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as notificationsRepository from '@/repositories/notifications.repository';

/**
 * GET /api/notifications
 * 현재 사용자의 알림 목록 조회
 */
export const GET = async (_request: NextRequest) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await notificationsRepository.findByUser(
      supabase,
      user.id,
      50,
      0
    );

    if (error) {
      console.error('[GET /api/notifications] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // actor_id가 있는 경우 actor의 프로필 정보 조회
    const notificationsWithActor = await Promise.all(
      (data || []).map(async (notification) => {
        if (!notification.actor_id) {
          return {
            ...notification,
            actor_profile: null,
          };
        }

        const { data: actorProfile } = await supabase
          .from('user_profiles')
          .select('id, nickname, avatar_url, animal_type')
          .eq('id', notification.actor_id)
          .maybeSingle();

        return {
          ...notification,
          actor_profile: actorProfile,
        };
      })
    );

    return NextResponse.json({ data: notificationsWithActor });
  } catch (error) {
    console.error('[GET /api/notifications] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

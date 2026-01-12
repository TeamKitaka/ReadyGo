import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as notificationsRepository from '@/repositories/notifications.repository';

/**
 * POST /api/notifications/mark-read
 * 알림 읽음 처리
 * Body: { notificationId?: number } - notificationId가 없으면 모두 읽음 처리
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body;

    if (notificationId) {
      // 단일 알림 읽음 처리
      const { error } = await notificationsRepository.markAsRead(
        supabase,
        notificationId
      );

      if (error) {
        console.error('[POST /api/notifications/mark-read] Error:', error);
        return NextResponse.json(
          { error: 'Failed to mark notification as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } else {
      // 모두 읽음 처리
      const { error } = await notificationsRepository.markAllAsRead(
        supabase,
        user.id
      );

      if (error) {
        console.error('[POST /api/notifications/mark-read] Error:', error);
        return NextResponse.json(
          { error: 'Failed to mark all notifications as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('[POST /api/notifications/mark-read] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


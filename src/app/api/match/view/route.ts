/**
 * Match View API
 * 
 * POST /api/match/view
 * - 프로필 조회 이력 기록 (match_recent_views)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. 요청 파라미터
    const { targetUserId } = await request.json();
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'targetUserId is required' },
        { status: 400 }
      );
    }
    
    // 3. match_recent_views에 기록
    const { error: insertError } = await supabase
      .from('match_recent_views')
      .insert({
        viewer_id: user.id,
        target_user_id: targetUserId,
        viewed_at: new Date().toISOString(),
      });
    
    if (insertError) {
      console.error('[Match View API] Insert error:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Match View API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


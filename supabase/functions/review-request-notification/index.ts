/**
 * Review Request Notification Edge Function
 *
 * 📌 역할:
 * - DB Trigger payload 수신
 * - review_requests INSERT 이벤트 확인
 * - payload → Service Input 변환
 * - Notification Service 호출
 * - 결과 로깅
 *
 * 📌 트리거 조건:
 * - review_requests 테이블 AFTER INSERT
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { Database } from '../../types/database.types.ts';
import { createReviewRequestedNotification } from '../_shared/services/notifications/createReviewRequestedNotification.service.ts';

Deno.serve(async (req) => {
  try {
    // CORS 처리
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers':
            'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Payload 파싱
    const payload = await req.json();
    const { type, table, record } = payload;

    // 이벤트 타입 검증
    if (type !== 'INSERT' || table !== 'review_requests') {
      console.log(
        `[Review Request Notification] Ignored: type=${type}, table=${table}`
      );
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 필수 필드 검증
    if (!record || !record.id || !record.actor_id || !record.target_id || !record.game_start_log_id) {
      console.log(
        `[Review Request Notification] Ignored: invalid payload`
      );
      return new Response(
        JSON.stringify({ success: true, message: 'Invalid payload' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const reviewRequestId = record.id;
    const actorId = record.actor_id; // 게임 시작을 누른 사람 (후기를 받을 사람)
    const targetId = record.target_id; // 후기를 써야 하는 사람
    const gameStartLogId = record.game_start_log_id;

    console.log(
      `[Review Request Notification] Started: review_request_id=${reviewRequestId}, actor_id=${actorId}, target_id=${targetId}`
    );

    // Supabase Admin 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // game_start_log 조회 (context_type, context_id 필요)
    const { data: gameStartLog, error: logError } = await supabase
      .from('game_start_logs')
      .select('context_type, context_id')
      .eq('id', gameStartLogId)
      .single();

    if (logError || !gameStartLog) {
      console.error(
        `[Review Request Notification] Error fetching game_start_log:`,
        logError
      );
      throw logError || new Error('Game start log not found');
    }

    // context_type 검증
    if (gameStartLog.context_type !== 'chat' && gameStartLog.context_type !== 'party') {
      console.log(
        `[Review Request Notification] Ignored: invalid context_type=${gameStartLog.context_type}`
      );
      return new Response(
        JSON.stringify({ success: true, message: 'Invalid context_type' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Service 호출
    const result = await createReviewRequestedNotification(supabase, {
      reviewRequestId,
      actorId,
      targetId,
      contextType: gameStartLog.context_type as 'chat' | 'party',
      contextId: gameStartLog.context_id,
    });

    // 결과 확인
    if (result.error) {
      console.error(
        `[Review Request Notification] Error: review_request_id=${reviewRequestId}`,
        result.error
      );
      throw result.error;
    }

    console.log(
      `[Review Request Notification] Completed: review_request_id=${reviewRequestId}, notification created`
    );

    return new Response(
      JSON.stringify({
        success: true,
        notificationId: result.data?.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Review Request Notification] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});


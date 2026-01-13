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

    // 필수 필드 검증 (기본 필드)
    if (!record || !record.id || !record.actor_id || !record.target_id || !record.game_start_log_id) {
      console.log(
        `[Review Request Notification] Ignored: invalid payload (missing required fields)`
      );
      return new Response(
        JSON.stringify({ success: true, message: 'Invalid payload' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 형태 검증: context_type, context_id 존재 여부 및 값 검증
    console.log(
      `[Review Request Notification] Checking context fields: context_type=${record.context_type}, context_id=${record.context_id}`
    );
    
    if (!record.context_type || !record.context_id) {
      console.log(
        `[Review Request Notification] Ignored: missing context_type or context_id`,
        { context_type: record.context_type, context_id: record.context_id }
      );
      return new Response(
        JSON.stringify({ success: true, message: 'Missing context fields' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // context_type 값 검증 (chat 또는 party만 허용)
    if (record.context_type !== 'chat' && record.context_type !== 'party') {
      console.log(
        `[Review Request Notification] Ignored: invalid context_type=${record.context_type} (expected 'chat' or 'party')`
      );
      return new Response(
        JSON.stringify({ success: true, message: 'Invalid context_type' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log(
      `[Review Request Notification] Context validation passed: context_type=${record.context_type}, context_id=${record.context_id}`
    );

    const reviewRequestId = record.id;
    const actorId = record.actor_id; // 게임 시작을 누른 사람 (후기를 받을 사람)
    const targetId = record.target_id; // 후기를 써야 하는 사람
    const contextType = record.context_type as 'chat' | 'party';
    const contextId = String(record.context_id); // number를 string으로 변환

    console.log(
      `[Review Request Notification] Started: review_request_id=${reviewRequestId}, actor_id=${actorId}, target_id=${targetId}, context_type=${contextType} (raw: ${record.context_type}), context_id=${contextId}`
    );
    console.log(
      `[Review Request Notification] Full record:`,
      JSON.stringify(record, null, 2)
    );

    // Supabase Admin 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Service 호출 (형태 검증 완료, record에서 직접 사용)
    const result = await createReviewRequestedNotification(supabase, {
      reviewRequestId,
      actorId,
      targetId,
      contextType,
      contextId,
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


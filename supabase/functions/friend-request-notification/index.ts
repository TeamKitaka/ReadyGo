/**
 * Friend Request Notification Edge Function
 *
 * 📌 역할:
 * - DB Trigger payload 수신
 * - friend_requests INSERT 이벤트 확인
 * - payload → Service Input 변환
 * - Notification Service 호출
 * - 결과 로깅
 *
 * 📌 트리거 조건:
 * - friend_requests 테이블 AFTER INSERT
 *
 * 📌 중복 방지 전략 (옵션 A):
 * - 최근 1분 내 처리한 requestId를 Map에 저장
 * - 메모리 기반 빠른 중복 체크
 * - UNIQUE constraint와 이중 방어
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { Database } from '../../types/database.types.ts';
import { createFriendRequestNotification } from '../_shared/services/notifications/createFriendRequestNotification.service.ts';

// 옵션 A: 최근 1분 내 처리한 requestId를 메모리에 저장
// Map<requestId, timestamp>
const processedRequests = new Map<number, number>();

// 주기적으로 1분 이상 지난 항목 정리 (메모리 누수 방지)
setInterval(() => {
  const cutoff = Date.now() - 60000; // 60초
  for (const [id, time] of processedRequests.entries()) {
    if (time < cutoff) {
      processedRequests.delete(id);
    }
  }
}, 30000); // 30초마다 정리

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
    const { type, table, record, timestamp } = payload;

    // 이벤트 타입 검증
    if (type !== 'INSERT' || table !== 'friend_requests') {
      console.log(
        `[Friend Request Notification] Ignored: type=${type}, table=${table}`
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
    if (!record || !record.id || !record.sender_id || !record.receiver_id) {
      console.error('[Friend Request Notification] Invalid payload:', payload);
      return new Response(
        JSON.stringify({ error: 'Invalid payload: missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const requestId = record.id;

    console.log(
      `[Friend Request Notification] Started: requestId=${requestId}, timestamp=${timestamp}`
    );

    // 옵션 A: 중복 체크 (최근 1분 내 처리 이력)
    const now = Date.now();
    const lastProcessed = processedRequests.get(requestId);

    if (lastProcessed && now - lastProcessed < 60000) {
      console.log(
        `[Friend Request Notification] Duplicate detected: requestId=${requestId}, skipping (last processed ${Math.floor((now - lastProcessed) / 1000)}s ago)`
      );
      return new Response(JSON.stringify({ success: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Supabase Admin 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Service 호출
    const result = await createFriendRequestNotification(supabase, {
      requestId: record.id,
      senderId: record.sender_id,
      receiverId: record.receiver_id,
    });

    // 처리 완료 후 Map에 추가
    processedRequests.set(requestId, now);

    // 결과 확인
    if (result.error) {
      // 에러 발생 시 로그 및 throw
      console.error(
        `[Friend Request Notification] Error: requestId=${requestId}`,
        result.error
      );
      throw result.error;
    }

    // data가 null이면 중복으로 무시된 경우 (ignoreDuplicates)
    if (!result.data) {
      console.log(
        `[Friend Request Notification] Duplicate ignored: requestId=${requestId}`
      );
      return new Response(JSON.stringify({ success: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `[Friend Request Notification] Completed: requestId=${requestId}, notificationId=${result.data.id}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        notificationId: result.data.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Friend Request Notification] Error:', error);
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

/**
 * Create Review Requests Edge Function
 *
 * 📌 새로운 설계:
 * - game_start_logs = "이 사용자가 이 맥락에서 게임을 시작했다" (개별 참여자의 확정 로그)
 * - 같은 context_id + context_type에서 game_start_logs를 남긴 사용자들끼리만 후기 요청 생성
 *
 * 📌 역할:
 * - pg_cron에서 호출 (30초/30분 전에 생성된 game_start_logs 처리)
 * - context_type + context_id를 받아서 처리
 * - 같은 context의 모든 game_start_logs를 조회하여 사용자들끼리 pair 생성
 * - Service 호출
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { Database } from '../../types/database.types.ts';
import { createReviewRequests } from '../_shared/services/reviews/createReviewRequests.service.ts';

Deno.serve(async (req) => {
  try {
    console.log('[Create Review Requests] Request received:', req.method);

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
    let payload;
    try {
      const text = await req.text();
      console.log('[Create Review Requests] Request body:', text);
      payload = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error('[Create Review Requests] JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Create Review Requests] Parsed payload:', payload);

    const { context_type, context_id } = payload;

    if (!context_type || !context_id) {
      console.error('[Create Review Requests] Missing required fields:', {
        context_type,
        context_id,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'context_type and context_id are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // context_type 검증 (chat 또는 party만 허용)
    if (context_type !== 'chat' && context_type !== 'party') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid context_type. Must be "chat" or "party"',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Supabase Admin 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Service 호출 (같은 context의 game_start_logs를 조회하여 사용자들끼리 pair 생성)
    // UNIQUE constraint로 중복 방지되므로 중복 체크는 Service 내부에서 처리
    const reviewRequests = await createReviewRequests(supabase, {
      contextType: context_type as 'chat' | 'party',
      contextId: context_id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        count: reviewRequests.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Create Review Requests] Error:', error);
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

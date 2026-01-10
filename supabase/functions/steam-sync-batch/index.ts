import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { batchSyncSteamGames } from '../_shared/services/steam/batchSyncSteamGames.service.ts';

/**
 * Steam 배치 동기화 Edge Function
 *
 * 책임:
 * - Service Role Supabase Client 생성
 * - batchSyncSteamGames Service 호출
 * - HTTP 요청/응답 처리
 *
 * 비책임:
 * - 유저 목록 조회 (Service에서 처리)
 * - 배치 실행 로직 (Service에서 처리)
 * - 결과 집계 (Service에서 처리)
 * - Steam API 호출 (Service에서 처리)
 */

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function 핸들러
 */
Deno.serve(async (req) => {
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Edge Function] Starting batch sync...');

    // 1. Authorization 체크 (필수)
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      console.error('[Edge Function] Unauthorized: No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - API key required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // 2. Service Role Supabase Client 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 3. 배치 동기화 실행 (Service에 위임)
    // limit: 10명씩 처리 (Edge Function timeout 방지)
    const result = await batchSyncSteamGames(supabase, { limit: 10 });

    // 4. 결과 반환
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[Edge Function] Fatal error:', error);

    return new Response(
      JSON.stringify({
        error: 'Batch sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

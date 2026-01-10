/**
 * Steam Stats Update Edge Function
 *
 * 📌 역할:
 * - 주기적으로 모든 Steam 연동 유저의 stats 갱신
 * - updateSteamUserStats() 호출
 *
 * 📌 트리거 조건:
 * 1. Steam 동기화 성공 후 즉시 실행 (POST 요청)
 * 2. 배치 작업으로 주 1회 전체 재계산 (Cron)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { Database } from '../../types/database.types.ts';
import { updateSteamUserStats } from '../_shared/services/steam/updateSteamUserStats.service.ts';

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

    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // 요청 본문 파싱
    const { userId, mode = 'single' } = await req.json();

    if (mode === 'single') {
      // 단일 유저 업데이트 (동기화 직후 호출)
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required for single mode' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      console.log(`[Steam Stats Update] Single mode: ${userId}`);
      await updateSteamUserStats(supabase, userId);

      return new Response(JSON.stringify({ success: true, userId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (mode === 'batch') {
      // 배치 모드: 모든 Steam 연동 유저 업데이트
      console.log(`[Steam Stats Update] Batch mode started`);

      // Steam 연동된 모든 유저 조회
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id')
        .not('steam_id', 'is', null);

      if (profilesError) {
        throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
      }

      if (!profiles || profiles.length === 0) {
        console.log(`[Steam Stats Update] No Steam-linked users found`);
        return new Response(
          JSON.stringify({ success: true, updatedCount: 0 }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      console.log(`[Steam Stats Update] Found ${profiles.length} users`);

      let successCount = 0;
      let failCount = 0;

      // 각 유저별로 stats 업데이트
      for (const profile of profiles) {
        try {
          await updateSteamUserStats(supabase, profile.id);
          successCount++;
        } catch (error) {
          console.error(
            `[Steam Stats Update] Failed for user ${profile.id}:`,
            error
          );
          failCount++;
        }

        // Rate limiting: 100ms 대기
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(
        `[Steam Stats Update] Batch completed: ${successCount} success, ${failCount} failed`
      );

      return new Response(
        JSON.stringify({
          success: true,
          updatedCount: successCount,
          failedCount: failCount,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid mode. Use "single" or "batch"' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('[Steam Stats Update] Error:', error);
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

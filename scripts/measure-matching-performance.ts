/**
 * 매칭 시스템 성능 측정 스크립트
 *
 * 사용법:
 * 1. 환경 변수 설정 (.env.local)
 * 2. TEST_USER_ID 설정
 * 3. npx tsx scripts/measure-matching-performance.ts
 *
 * 측정 항목:
 * - 홈 화면 매칭 (4개)
 * - 매칭 화면 (12개, 캐시 미스)
 * - 매칭 화면 (12개, 캐시 히트)
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types/database.types';

// ⚠️ 실제 테스트할 사용자 ID로 변경하세요
const TEST_USER_ID = 'YOUR_TEST_USER_ID';

// 측정 횟수 (평균값 계산용)
const ITERATIONS = 5;

// Supabase 클라이언트 생성
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * 성능 측정 헬퍼
 */
async function measure<T>(
  name: string,
  fn: () => Promise<T>,
  iterations: number = ITERATIONS
): Promise<{ avg: number; min: number; max: number; results: T }> {
  const times: number[] = [];
  let lastResult: T | null = null;

  console.log(`\n📊 ${name}`);
  console.log('─'.repeat(50));

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    lastResult = await fn();
    const end = performance.now();
    const duration = end - start;
    times.push(duration);

    console.log(`   ${i + 1}회: ${duration.toFixed(2)}ms`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log('─'.repeat(50));
  console.log(`   평균: ${avg.toFixed(2)}ms`);
  console.log(`   최소: ${min.toFixed(2)}ms`);
  console.log(`   최대: ${max.toFixed(2)}ms`);

  return { avg, min, max, results: lastResult! };
}

/**
 * 홈 화면 매칭 측정
 */
async function measureHomeMatches() {
  const { avg, min, max, results } = await measure(
    '홈 화면 매칭 (4개)',
    async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('supabase.co', 'vercel.app')}/api/match/results`,
        {
          headers: {
            'Content-Type': 'application/json',
            // 실제 환경에서는 인증 헤더 추가 필요
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return response.json();
    }
  );

  console.log(`   결과 개수: ${results.results?.length || 0}개`);

  return { avg, min, max, count: results.results?.length || 0 };
}

/**
 * 매칭 화면 측정 (캐시 미스)
 */
async function measureMatchListCacheMiss() {
  const { avg, min, max, results } = await measure(
    '매칭 화면 (12개, 캐시 미스)',
    async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('supabase.co', 'vercel.app')}/api/match/list?minScore=65&refresh=true`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return response.json();
    }
  );

  console.log(`   결과 개수: ${results.results?.length || 0}개`);

  return { avg, min, max, count: results.results?.length || 0 };
}

/**
 * 매칭 화면 측정 (캐시 히트)
 */
async function measureMatchListCacheHit() {
  const { avg, min, max, results } = await measure(
    '매칭 화면 (12개, 캐시 히트)',
    async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('supabase.co', 'vercel.app')}/api/match/list?minScore=65&refresh=false`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return response.json();
    }
  );

  console.log(`   결과 개수: ${results.results?.length || 0}개`);

  return { avg, min, max, count: results.results?.length || 0 };
}

/**
 * 캐시 통계 조회
 */
async function getCacheStats() {
  console.log('\n📈 캐시 통계');
  console.log('─'.repeat(50));

  // 캐시 히트율
  const { data: cacheData } = await supabase
    .from('match_results_cache')
    .select('context, computed_at')
    .eq('viewer_id', TEST_USER_ID);

  if (cacheData) {
    const homeCache = cacheData.filter((c) => c.context === 'home');
    const matchCache = cacheData.filter((c) => c.context === 'match');

    console.log(`   홈 화면 캐시: ${homeCache.length}개`);
    console.log(`   매칭 화면 캐시: ${matchCache.length}개`);

    if (matchCache.length > 0) {
      const latestMatch = matchCache.reduce((latest, current) => {
        if (!current.computed_at || !latest.computed_at) {
          return latest;
        }
        return new Date(current.computed_at) > new Date(latest.computed_at)
          ? current
          : latest;
      });
      if (latestMatch.computed_at) {
        const age = Date.now() - new Date(latestMatch.computed_at).getTime();
        console.log(`   매칭 캐시 나이: ${(age / 1000).toFixed(0)}초`);
      }
    }
  }

  // 노출 이력
  const { data: exposureData } = await supabase
    .from('match_exposure_log')
    .select('exposed_at')
    .eq('viewer_id', TEST_USER_ID)
    .gte(
      'exposed_at',
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    );

  console.log(`   24시간 노출 이력: ${exposureData?.length || 0}개`);

  // 조회 이력
  const { data: viewData } = await supabase
    .from('match_recent_views')
    .select('viewed_at')
    .eq('user_id', TEST_USER_ID)
    .gte('viewed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  console.log(`   24시간 조회 이력: ${viewData?.length || 0}개`);
}

/**
 * 캐시 초기화
 */
async function clearCache() {
  console.log('\n🗑️  캐시 초기화');
  console.log('─'.repeat(50));

  const [
    { error: cacheError },
    { error: exposureError },
    { error: viewError },
  ] = await Promise.all([
    supabase.from('match_results_cache').delete().eq('viewer_id', TEST_USER_ID),
    supabase.from('match_exposure_log').delete().eq('viewer_id', TEST_USER_ID),
    supabase.from('match_recent_views').delete().eq('user_id', TEST_USER_ID),
  ]);

  if (cacheError || exposureError || viewError) {
    console.error('   ❌ 캐시 초기화 실패:', {
      cacheError,
      exposureError,
      viewError,
    });
  } else {
    console.log('   ✅ 캐시 초기화 완료');
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║       매칭 시스템 성능 측정                       ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  // 환경 변수 확인
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error(
      '❌ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.'
    );
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      '❌ SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다.'
    );
    process.exit(1);
  }

  if (TEST_USER_ID === 'YOUR_TEST_USER_ID') {
    console.error('❌ TEST_USER_ID를 실제 사용자 ID로 변경하세요.');
    process.exit(1);
  }

  console.log(`\n📝 설정`);
  console.log('─'.repeat(50));
  console.log(`   테스트 사용자: ${TEST_USER_ID}`);
  console.log(`   측정 횟수: ${ITERATIONS}회`);
  console.log(`   Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  try {
    // 1. 캐시 통계 (초기)
    await getCacheStats();

    // 2. 캐시 초기화
    await clearCache();

    // 3. 홈 화면 매칭 (캐시 미스)
    const homeResults = await measureHomeMatches();

    // 4. 매칭 화면 (캐시 미스)
    const matchMissResults = await measureMatchListCacheMiss();

    // 5. 매칭 화면 (캐시 히트)
    const matchHitResults = await measureMatchListCacheHit();

    // 6. 캐시 통계 (최종)
    await getCacheStats();

    // 7. 요약
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║       측정 결과 요약                              ║');
    console.log('╚═══════════════════════════════════════════════════╝');

    console.log('\n📊 응답 시간 (평균)');
    console.log('─'.repeat(50));
    console.log(`   홈 화면:              ${homeResults.avg.toFixed(2)}ms`);
    console.log(
      `   매칭 화면 (캐시 미스): ${matchMissResults.avg.toFixed(2)}ms`
    );
    console.log(
      `   매칭 화면 (캐시 히트): ${matchHitResults.avg.toFixed(2)}ms`
    );

    console.log('\n📈 성능 개선율');
    console.log('─'.repeat(50));
    const improvement =
      ((matchMissResults.avg - matchHitResults.avg) / matchMissResults.avg) *
      100;
    console.log(`   캐시 효과: ${improvement.toFixed(1)}% 개선`);
    console.log(
      `   속도 향상: ${(matchMissResults.avg / matchHitResults.avg).toFixed(1)}배`
    );

    console.log('\n✅ 측정 완료!\n');
  } catch (error) {
    console.error('\n❌ 측정 중 오류 발생:', error);
    process.exit(1);
  }
}

// 실행
main().catch((error) => {
  console.error('❌ 예상치 못한 오류:', error);
  process.exit(1);
});

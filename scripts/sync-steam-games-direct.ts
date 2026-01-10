/**
 * Steam 게임 데이터 직접 동기화 스크립트
 * 
 * Service Role Key를 사용하여
 * test26~test125 계정의 Steam 게임 데이터를 직접 동기화합니다.
 */

// ⚠️  dotenv를 가장 먼저 로드!
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 환경 변수 오류');
  process.exit(1);
}

// Service Role Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * test26~test125 계정 userId 조회
 */
async function getTestUserIds(): Promise<{ userId: string; email: string }[]> {
  // auth.users에서 직접 조회 (Service Role Key 사용)
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('❌ 유저 조회 실패:', error);
    return [];
  }

  // test26~test125 필터링 및 정렬
  return data.users
    .filter((user) => {
      if (!user.email) return false;
      const match = user.email.match(/^test(\d+)@readygo\.test$/);
      if (!match) return false;
      const num = parseInt(match[1], 10);
      return num >= 26 && num <= 125;
    })
    .sort((a, b) => a.email!.localeCompare(b.email!))
    .map((user) => ({ userId: user.id, email: user.email! }));
}

/**
 * 개별 유저 동기화
 */
async function syncUser(userId: string, email: string) {
  try {
    // 동적 import로 syncSteamGames 로드
    const { syncSteamGames } = await import('../src/services/steam/syncSteamGames.service.js');
    const result = await syncSteamGames(supabase, userId);
    
    if (result.status === 'success') {
      console.log(`   ✅ ${email}: 성공 (게임 ${result.syncedGamesCount}개)`);
    } else if (result.status === 'private') {
      console.log(`   ⚠️  ${email}: Steam 프로필 비공개`);
    } else if (result.status === 'not_linked') {
      console.log(`   ⚠️  ${email}: Steam 미연동`);
    } else {
      console.log(`   ❌ ${email}: ${result.status}`);
    }

    return result;
  } catch (error) {
    console.error(`   ❌ ${email}: 에러 - ${error}`);
    return { status: 'failed' as const, syncedGamesCount: 0 };
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('🚀 Steam 게임 데이터 동기화 시작...\n');

  // 1. 테스트 유저 조회
  console.log('📋 Step 1: 유저 조회 중...');
  const users = await getTestUserIds();
  console.log(`✅ ${users.length}명 발견\n`);

  if (users.length === 0) {
    console.error('❌ 유저를 찾을 수 없습니다.');
    return;
  }

  // 2. 동기화 (1명씩 순차 처리)
  console.log('🔄 Step 2: 동기화 시작...');
  console.log('─'.repeat(60));

  const results = {
    total: users.length,
    success: 0,
    private: 0,
    notLinked: 0,
    failed: 0,
    totalGames: 0,
  };

  for (const user of users) {
    const result = await syncUser(user.userId, user.email);

    if (result.status === 'success') {
      results.success++;
      results.totalGames += result.syncedGamesCount;
    } else if (result.status === 'private') {
      results.private++;
    } else if (result.status === 'not_linked') {
      results.notLinked++;
    } else {
      results.failed++;
    }

    // Rate limit 방지: 각 유저 사이 1초 대기
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 3. 결과
  console.log('\n');
  console.log('='.repeat(60));
  console.log('✅ 완료!\n');
  console.log('📊 최종 결과:');
  console.log(`   • 총 처리: ${results.total}명`);
  console.log(`   • 성공: ${results.success}명 (게임 ${results.totalGames}개)`);
  console.log(`   • 비공개 프로필: ${results.private}명`);
  console.log(`   • Steam 미연동: ${results.notLinked}명`);
  console.log(`   • 실패: ${results.failed}명`);
  console.log('='.repeat(60));
}

main().catch(console.error);


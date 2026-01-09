/**
 * Clear Steam Data Script (Optional)
 *
 * steam_user_games, steam_user_stats 테이블의 모든 데이터 삭제
 *
 * ⚠️ 주의:
 * - 이 스크립트는 선택사항입니다.
 * - Steam 데이터를 유지하는 것을 권장합니다.
 * - 삭제 시 모든 사용자가 Steam 재연동 필요
 * - Steam API Rate Limit 고려 필요 (193명 동시 동기화)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('');
  console.log('🚨 Steam 데이터 삭제 스크립트');
  console.log('='.repeat(60));
  console.log('⚠️  이 작업은 되돌릴 수 없습니다!');
  console.log('');
  console.log('삭제 대상:');
  console.log('  - steam_user_games (게임 목록)');
  console.log('  - steam_user_stats (플레이 스타일, 장르)');
  console.log('');
  console.log('영향:');
  console.log('  - 모든 사용자 Steam 연동 해제');
  console.log('  - 게임 목록 삭제');
  console.log('  - Steam 기반 매칭 불가능');
  console.log('  - 사용자 재연동 필요 (193명)');
  console.log('='.repeat(60));
  console.log('');

  // 사용자 확인 (환경변수로 우회 가능)
  if (process.env.FORCE_DELETE !== 'yes') {
    console.log('💡 실행하려면 다음 명령어를 사용하세요:');
    console.log('   FORCE_DELETE=yes npm run seed:clear-steam');
    console.log('');
    console.log('🛡️  권장: Steam 데이터 유지 (이 스크립트 실행 안 함)');
    process.exit(0);
  }

  try {
    // 1. steam_user_games 개수 확인
    const { count: gamesCount, error: gamesCountError } = await supabase
      .from('steam_user_games')
      .select('*', { count: 'exact', head: true });

    if (gamesCountError) {
      console.error(
        '❌ steam_user_games 개수 확인 실패:',
        gamesCountError.message
      );
      throw gamesCountError;
    }

    // 2. steam_user_stats 개수 확인
    const { count: statsCount, error: statsCountError } = await supabase
      .from('steam_user_stats')
      .select('*', { count: 'exact', head: true });

    if (statsCountError) {
      console.error(
        '❌ steam_user_stats 개수 확인 실패:',
        statsCountError.message
      );
      throw statsCountError;
    }

    console.log('📊 삭제 전 데이터:');
    console.log(`   steam_user_games: ${gamesCount}개`);
    console.log(`   steam_user_stats: ${statsCount}개`);
    console.log('');

    if (gamesCount === 0 && statsCount === 0) {
      console.log('✅ 이미 Steam 데이터가 비어있습니다.');
      return;
    }

    // 3. steam_user_games 삭제
    console.log('🗑️  steam_user_games 삭제 중...');
    const { error: deleteGamesError } = await supabase
      .from('steam_user_games')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000');

    if (deleteGamesError) {
      console.error('❌ steam_user_games 삭제 실패:', deleteGamesError.message);
      throw deleteGamesError;
    }

    // 4. steam_user_stats 삭제
    console.log('🗑️  steam_user_stats 삭제 중...');
    const { error: deleteStatsError } = await supabase
      .from('steam_user_stats')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000');

    if (deleteStatsError) {
      console.error('❌ steam_user_stats 삭제 실패:', deleteStatsError.message);
      throw deleteStatsError;
    }

    // 5. 삭제 후 확인
    const { count: gamesAfter, error: gamesAfterError } = await supabase
      .from('steam_user_games')
      .select('*', { count: 'exact', head: true });

    if (gamesAfterError) {
      console.error(
        '❌ 삭제 후 steam_user_games 확인 실패:',
        gamesAfterError.message
      );
      throw gamesAfterError;
    }

    const { count: statsAfter, error: statsAfterError } = await supabase
      .from('steam_user_stats')
      .select('*', { count: 'exact', head: true });

    if (statsAfterError) {
      console.error(
        '❌ 삭제 후 steam_user_stats 확인 실패:',
        statsAfterError.message
      );
      throw statsAfterError;
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Steam 데이터 삭제 완료!');
    console.log('');
    console.log(`📊 통계:`);
    console.log(`   steam_user_games: ${gamesCount} → ${gamesAfter}개`);
    console.log(`   steam_user_stats: ${statsCount} → ${statsAfter}개`);
    console.log(`   총 삭제: ${(gamesCount || 0) + (statsCount || 0)}개`);
    console.log('='.repeat(60));
    console.log('');
    console.log('💡 다음 단계:');
    console.log('  1. 개발 서버 재시작');
    console.log('  2. 사용자들에게 Steam 재연동 안내');
    console.log('  3. 게임 목록 재동기화 필요');
    console.log('');
    console.log('⚠️  주의: Steam API Rate Limit 고려');
  } catch (error) {
    console.error('');
    console.error('💥 오류 발생:', error);
    process.exit(1);
  }
}

main();

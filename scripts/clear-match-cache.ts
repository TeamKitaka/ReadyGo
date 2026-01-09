/**
 * Clear Match Cache Script
 *
 * match_results_cache 테이블의 모든 데이터 삭제
 * user_profiles, user_traits 복구 후 무효한 캐시 제거
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
  console.log('🗑️  매칭 캐시 삭제 시작...');
  console.log('');

  try {
    // 1. 현재 캐시 개수 확인
    const { count: beforeCount, error: countError } = await supabase
      .from('match_results_cache')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ 캐시 개수 확인 실패:', countError.message);
      throw countError;
    }

    console.log(`📊 삭제 전 캐시: ${beforeCount}개`);
    console.log('');

    if (beforeCount === 0) {
      console.log('✅ 이미 캐시가 비어있습니다.');
      return;
    }

    // 2. 전체 삭제 (TRUNCATE 사용 - 더 빠르고 안전)
    console.log('🗑️  캐시 삭제 중 (TRUNCATE)...');
    
    // ⚠️ TRUNCATE는 Supabase SDK에서 직접 지원하지 않으므로
    // raw SQL을 사용하거나 DELETE를 사용합니다.
    // 하지만 FK 참조가 없으므로 안전하게 사용 가능
    const { error: deleteError } = await supabase.rpc('truncate_match_cache');

    // RPC가 없으면 DELETE 사용 (폴백)
    if (deleteError && deleteError.message.includes('function')) {
      console.log('⚠️  TRUNCATE RPC 없음, DELETE 사용...');
      const { error: fallbackError } = await supabase
        .from('match_results_cache')
        .delete()
        .neq('viewer_id', '00000000-0000-0000-0000-000000000000');
      
      if (fallbackError) {
        console.error('❌ 삭제 실패:', fallbackError.message);
        throw fallbackError;
      }
    } else if (deleteError) {
      console.error('❌ 삭제 실패:', deleteError.message);
      throw deleteError;
    }

    // 3. 삭제 후 확인
    const { count: afterCount, error: afterCountError } = await supabase
      .from('match_results_cache')
      .select('*', { count: 'exact', head: true });

    if (afterCountError) {
      console.error('❌ 삭제 후 확인 실패:', afterCountError.message);
      throw afterCountError;
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 매칭 캐시 삭제 완료!');
    console.log('');
    console.log(`📊 통계:`);
    console.log(`   삭제 전: ${beforeCount}개`);
    console.log(`   삭제 후: ${afterCount}개`);
    console.log(`   삭제됨: ${(beforeCount || 0) - (afterCount || 0)}개`);
    console.log('='.repeat(60));
    console.log('');
    console.log('💡 다음 단계:');
    console.log('  1. 개발 서버 재시작 (캐시 메모리 초기화)');
    console.log('  2. 다음 매칭 요청 시 자동으로 새로운 캐시 생성');
    console.log('  3. 사용자들이 성향분석 완료 후 정상 매칭 가능');
  } catch (error) {
    console.error('');
    console.error('💥 오류 발생:', error);
    process.exit(1);
  }
}

main();

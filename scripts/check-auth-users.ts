/**
 * Check Auth Users Script
 * 
 * auth.users에 남아있는 모든 계정 확인
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
  console.log('🔍 auth.users 확인 중...');
  console.log('');

  try {
    // auth.users 조회
    const { data: authData, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ 조회 실패:', error.message);
      process.exit(1);
    }

    const users = authData?.users || [];
    
    console.log(`📊 총 ${users.length}명의 auth.users 발견`);
    console.log('');

    // 테스트 계정과 실제 계정 분류
    const testUsers = users.filter(u => u.email?.includes('@readygo.test'));
    const realUsers = users.filter(u => !u.email?.includes('@readygo.test'));

    console.log('=' .repeat(70));
    console.log(`🧪 테스트 계정: ${testUsers.length}명`);
    console.log('=' .repeat(70));
    testUsers.forEach(u => {
      console.log(`  ${u.email} (${u.id})`);
      console.log(`    Created: ${u.created_at}`);
      console.log(`    Provider: ${u.app_metadata.provider}`);
      console.log('');
    });

    console.log('=' .repeat(70));
    console.log(`👤 실제 계정 (Google OAuth 등): ${realUsers.length}명`);
    console.log('=' .repeat(70));
    if (realUsers.length === 0) {
      console.log('  ❌ 실제 계정이 없습니다!');
      console.log('  🚨 모든 실제 사용자가 삭제되었을 수 있습니다!');
    } else {
      realUsers.forEach(u => {
        console.log(`  ${u.email} (${u.id})`);
        console.log(`    Created: ${u.created_at}`);
        console.log(`    Provider: ${u.app_metadata.provider}`);
        console.log('');
      });
    }

    console.log('');
    console.log('💡 다음 단계:');
    if (realUsers.length > 0) {
      console.log('  1. 실제 사용자 계정은 auth.users에 남아있음');
      console.log('  2. user_profiles 등을 수동으로 복구 가능');
      console.log('  3. 또는 Supabase Dashboard에서 백업 복구');
    } else {
      console.log('  1. Supabase Dashboard > Authentication > Users 확인');
      console.log('  2. 백업이 있다면 복구');
      console.log('  3. 없다면 사용자들이 다시 회원가입해야 함');
    }

  } catch (error) {
    console.error('');
    console.error('💥 오류 발생:', error);
    process.exit(1);
  }
}

main();


/**
 * Debug User Script
 * 
 * 특정 User ID의 모든 데이터를 출력
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

// 문제가 발생하는 User ID
const USER_ID = '0f362c2c-0565-463e-9080-ba3318680224';

async function main() {
  console.log('🔍 User 데이터 디버깅...');
  console.log(`User ID: ${USER_ID}`);
  console.log('');

  try {
    // 1. auth.users 확인
    console.log('='.repeat(60));
    console.log('1. auth.users');
    console.log('='.repeat(60));
    
    const { data: authData } = await supabase.auth.admin.listUsers();
    const user = authData?.users?.find(u => u.id === USER_ID);
    
    if (user) {
      console.log('✅ 존재함');
      console.log(`Email: ${user.email}`);
      console.log(`Created: ${user.created_at}`);
    } else {
      console.log('❌ 존재하지 않음');
    }
    console.log('');

    // 2. user_profiles 확인
    console.log('='.repeat(60));
    console.log('2. user_profiles');
    console.log('='.repeat(60));
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', USER_ID)
      .maybeSingle();

    if (profileError) {
      console.log('❌ 조회 실패:', profileError.message);
    } else if (profile) {
      console.log('✅ 존재함');
      console.log(JSON.stringify(profile, null, 2));
    } else {
      console.log('❌ 존재하지 않음');
    }
    console.log('');

    // 3. user_settings 확인
    console.log('='.repeat(60));
    console.log('3. user_settings');
    console.log('='.repeat(60));
    
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', USER_ID)
      .maybeSingle();

    if (settingsError) {
      console.log('❌ 조회 실패:', settingsError.message);
    } else if (settings) {
      console.log('✅ 존재함');
      console.log(JSON.stringify(settings, null, 2));
    } else {
      console.log('❌ 존재하지 않음');
    }
    console.log('');

    // 4. user_status 확인
    console.log('='.repeat(60));
    console.log('4. user_status');
    console.log('='.repeat(60));
    
    const { data: status, error: statusError } = await supabase
      .from('user_status')
      .select('*')
      .eq('user_id', USER_ID)
      .maybeSingle();

    if (statusError) {
      console.log('❌ 조회 실패:', statusError.message);
    } else if (status) {
      console.log('✅ 존재함');
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log('❌ 존재하지 않음');
    }
    console.log('');

    // 5. user_traits 확인
    console.log('='.repeat(60));
    console.log('5. user_traits');
    console.log('='.repeat(60));
    
    const { data: traits, error: traitsError } = await supabase
      .from('user_traits')
      .select('*')
      .eq('user_id', USER_ID)
      .maybeSingle();

    if (traitsError) {
      console.log('❌ 조회 실패:', traitsError.message);
    } else if (traits) {
      console.log('✅ 존재함');
      console.log(JSON.stringify(traits, null, 2));
    } else {
      console.log('❌ 존재하지 않음');
    }
    console.log('');

    // 6. user_play_schedules 확인
    console.log('='.repeat(60));
    console.log('6. user_play_schedules');
    console.log('='.repeat(60));
    
    const { data: schedules, error: schedulesError } = await supabase
      .from('user_play_schedules')
      .select('*')
      .eq('user_id', USER_ID);

    if (schedulesError) {
      console.log('❌ 조회 실패:', schedulesError.message);
    } else if (schedules && schedules.length > 0) {
      console.log(`✅ 존재함 (${schedules.length}개)`);
      console.log(JSON.stringify(schedules, null, 2));
    } else {
      console.log('❌ 존재하지 않음');
    }
    console.log('');

    // 7. 요약
    console.log('='.repeat(60));
    console.log('📊 요약');
    console.log('='.repeat(60));
    console.log(`auth.users: ${user ? '✅' : '❌'}`);
    console.log(`user_profiles: ${profile ? '✅' : '❌'}`);
    console.log(`user_settings: ${settings ? '✅' : '❌'}`);
    console.log(`user_status: ${status ? '✅' : '❌'}`);
    console.log(`user_traits: ${traits ? '✅' : '❌'}`);
    console.log(`user_play_schedules: ${schedules && schedules.length > 0 ? '✅' : '❌'}`);

  } catch (error) {
    console.error('');
    console.error('💥 오류 발생:', error);
    process.exit(1);
  }
}

main();


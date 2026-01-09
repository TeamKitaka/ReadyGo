/**
 * Data Consistency Check Script
 * 
 * 모든 테스트 계정의 데이터 일관성 체크
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

interface ConsistencyIssue {
  email: string;
  userId: string;
  issues: string[];
}

async function getAllAuthUsers() {
  console.log('🔍 모든 auth.users 조회 중 (페이지네이션 처리)...');
  
  const allUsers: any[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      console.error(`❌ auth.users 조회 실패 (페이지 ${page}):`, error.message);
      break;
    }

    if (!data || data.users.length === 0) {
      hasMore = false;
      break;
    }

    allUsers.push(...data.users);
    console.log(`   페이지 ${page}: ${data.users.length}명`);

    if (data.users.length < 1000) {
      hasMore = false;
    }
    page++;
  }

  console.log(`✅ 총 ${allUsers.length}명 조회 완료`);
  return allUsers;
}

async function main() {
  console.log('🔍 데이터 일관성 체크 시작...');
  console.log('');

  try {
    // 1. 모든 auth.users 조회 (페이지네이션 처리)
    const allUsers = await getAllAuthUsers();
    console.log('');

    const testUsers = allUsers.filter(u => u.email?.includes('@readygo.test'));
    console.log(`📊 총 ${testUsers.length}명의 테스트 계정 발견`);
    console.log('');

    const issues: ConsistencyIssue[] = [];

    // 2. 각 유저별로 필수 테이블 체크
    for (const user of testUsers) {
      const userId = user.id;
      const email = user.email || 'unknown';
      const userIssues: string[] = [];

      // user_profiles 체크
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        userIssues.push(`user_profiles 조회 실패: ${profileError.message}`);
      } else if (!profile) {
        userIssues.push('user_profiles 없음');
      } else {
        // user_profiles 데이터 검증
        if (!profile.nickname) userIssues.push('nickname 누락');
        if (!profile.animal_type) userIssues.push('animal_type 누락');
        if (!profile.tier) userIssues.push('tier 누락');
        if (profile.temperature_score === null || profile.temperature_score === undefined) {
          userIssues.push('temperature_score 누락');
        }
      }

      // user_settings 체크
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (settingsError) {
        userIssues.push(`user_settings 조회 실패: ${settingsError.message}`);
      } else if (!settings) {
        userIssues.push('user_settings 없음');
      }

      // user_status 체크
      const { data: status, error: statusError } = await supabase
        .from('user_status')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (statusError) {
        userIssues.push(`user_status 조회 실패: ${statusError.message}`);
      } else if (!status) {
        userIssues.push('user_status 없음');
      }

      // Cold Start 계정이 아닌 경우 추가 체크
      const isColdStart = email.match(/test([1-9]|1[0-9]|2[0-5])@/); // test1~25
      
      if (!isColdStart && profile?.animal_type !== 'unknown') {
        // user_traits 체크
        const { data: traits, error: traitsError } = await supabase
          .from('user_traits')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (traitsError) {
          userIssues.push(`user_traits 조회 실패: ${traitsError.message}`);
        } else if (!traits) {
          userIssues.push('user_traits 없음 (성향분석 완료 계정)');
        }

        // user_play_schedules 체크
        const { data: schedules, error: schedulesError } = await supabase
          .from('user_play_schedules')
          .select('user_id')
          .eq('user_id', userId);

        if (schedulesError) {
          userIssues.push(`user_play_schedules 조회 실패: ${schedulesError.message}`);
        } else if (!schedules || schedules.length === 0) {
          userIssues.push('user_play_schedules 없음 (성향분석 완료 계정)');
        }
      }

      if (userIssues.length > 0) {
        issues.push({ email, userId, issues: userIssues });
      }

      // Rate limiting 방지
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // 3. 결과 출력
    console.log('');
    console.log('=' .repeat(70));
    
    if (issues.length === 0) {
      console.log('✅ 모든 계정이 정상입니다!');
    } else {
      console.log(`⚠️  문제가 발견된 계정: ${issues.length}명`);
      console.log('');
      
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.email}`);
        console.log(`   User ID: ${issue.userId}`);
        issue.issues.forEach(i => {
          console.log(`   ❌ ${i}`);
        });
        console.log('');
      });

      console.log('💡 해결 방법:');
      console.log('   1. 해당 계정들을 삭제하고 재생성');
      console.log('   2. 또는 npm run seed:add-extra (test151~178 추가)');
    }
    
    console.log('=' .repeat(70));

    // 4. 요약 통계
    console.log('');
    console.log('📊 요약:');
    console.log(`   전체 계정: ${testUsers.length}명`);
    console.log(`   정상 계정: ${testUsers.length - issues.length}명`);
    console.log(`   문제 계정: ${issues.length}명`);

  } catch (error) {
    console.error('');
    console.error('💥 오류 발생:', error);
    process.exit(1);
  }
}

main();


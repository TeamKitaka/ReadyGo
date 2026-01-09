/**
 * Fix Real User Nicknames Script
 * 
 * 테스트 계정이 아닌 실제 사용자들의 닉네임을
 * generateNickname()으로 생성된 형태로 변경
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { generateNickname } from '../src/lib/nickname/generateNickname';

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

/**
 * generateNickname() 패턴인지 확인
 * - 한글 형용사 + 동물 + 숫자 조합
 * - 예: 행복한토끼1234, 즐거운여우5678
 * - ❌ 제외: "유저1234" 같은 단순 패턴
 */
function isGeneratedNickname(nickname: string): boolean {
  // "유저" + 숫자 패턴은 제외
  if (/^유저\d+$/.test(nickname)) {
    return false;
  }
  
  // generateNickname()은 한글 형용사 + 동물 + 숫자 형태
  // 최소 4글자 이상의 한글 + 4자리 숫자
  const pattern = /^[가-힣]{4,}[0-9]{4}$/;
  return pattern.test(nickname);
}

/**
 * 테스트 계정인지 확인
 * - test1@readygo.test ~ test200@readygo.test 형태
 */
function isTestAccount(email: string): boolean {
  return /^test\d+@readygo\.test$/.test(email);
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

async function fixUserNickname(userId: string, email: string, oldNickname: string) {
  try {
    // 새 닉네임 생성 (generateNickname 사용)
    const newNickname = generateNickname(8);

    // user_profiles 업데이트 (nickname, bio, avatar_url)
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        nickname: newNickname,
        bio: null,
        avatar_url: null
      })
      .eq('id', userId);

    if (error) {
      console.error(`❌ [${email}] 업데이트 실패:`, error.message);
      return { success: false, email, oldNickname, newNickname: null, error: error.message };
    }

    console.log(`✅ [${email}] ${oldNickname} → ${newNickname} (bio, avatar_url → null)`);
    return { success: true, email, oldNickname, newNickname };
  } catch (error) {
    console.error(`❌ [${email}] 예상치 못한 오류:`, error);
    return { success: false, email, oldNickname, newNickname: null, error: String(error) };
  }
}

async function main() {
  console.log('🚀 실제 사용자 닉네임 수정 시작...');
  console.log('');

  // 1. 모든 auth.users 조회
  const allUsers = await getAllAuthUsers();
  console.log('');

  // 2. 테스트 계정 필터링
  const realUsers = allUsers.filter(user => !isTestAccount(user.email));
  console.log(`📊 실제 사용자: ${realUsers.length}명 (테스트 제외)`);
  console.log('');

  if (realUsers.length === 0) {
    console.log('✅ 수정할 실제 사용자가 없습니다.');
    return;
  }

  // 3. user_profiles 조회
  const userIds = realUsers.map(u => u.id);
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, nickname')
    .in('id', userIds);

  if (profilesError) {
    console.error('❌ user_profiles 조회 실패:', profilesError.message);
    return;
  }

  console.log(`📊 user_profiles 조회: ${profiles?.length || 0}명`);
  console.log('');

  // 4. generateNickname 패턴이 아닌 닉네임 찾기
  const usersToFix = profiles?.filter(profile => {
    const nickname = profile.nickname;
    if (!nickname) return true; // 닉네임이 없으면 수정 대상
    return !isGeneratedNickname(nickname);
  }) || [];

  console.log(`🔧 수정 대상: ${usersToFix.length}명`);
  console.log('');

  if (usersToFix.length === 0) {
    console.log('✅ 모든 닉네임이 이미 올바른 형태입니다.');
    return;
  }

  // 5. 각 사용자별로 닉네임 수정
  console.log('🔄 닉네임 수정 중...');
  console.log('');

  const results = [];
  for (const profile of usersToFix) {
    const user = realUsers.find(u => u.id === profile.id);
    if (!user) continue;

    const result = await fixUserNickname(profile.id, user.email, profile.nickname || '(없음)');
    results.push(result);
  }

  // 6. 결과 요약
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ 닉네임 수정 완료!');
  console.log('');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log('📊 통계:');
  console.log(`   전체 실제 사용자: ${realUsers.length}명`);
  console.log(`   수정 대상: ${usersToFix.length}명`);
  console.log(`   성공: ${successCount}명`);
  console.log(`   실패: ${failCount}명`);
  console.log('='.repeat(60));
  console.log('');

  if (failCount > 0) {
    console.log('❌ 실패한 계정:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.email}: ${r.error}`);
      });
    console.log('');
  }

  console.log('💡 다음 단계:');
  console.log('  1. 개발 서버 재시작');
  console.log('  2. 실제 사용자 프로필 확인');
}

main();


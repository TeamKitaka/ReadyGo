/**
 * Restore User Profiles Script
 * 
 * auth.users는 있는데 user_profiles가 없는 계정들을 복구
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { generateNickname } from '../src/lib/nickname/generateNickname';
import { getTierFromTemperature } from './utils/tierMapping';

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

const STATUS_OPTIONS = ['online', 'offline', 'away'] as const;

/**
 * 결정론적(Deterministic) 데이터 생성 함수들
 * user_id를 해시하여 항상 동일한 값을 생성
 */

// user_id 기반 해시 생성
function hashUserId(userId: string): number {
  const hash = createHash('sha256').update(userId).digest('hex');
  return parseInt(hash.substring(0, 8), 16);
}

// 결정론적 온도 점수 생성 (0-100)
function getDeterministicTemperature(userId: string): number {
  const hash = hashUserId(userId);
  return hash % 101; // 0-100 범위
}

// 결정론적 상태 생성
function getDeterministicStatus(userId: string): typeof STATUS_OPTIONS[number] {
  const hash = hashUserId(userId);
  return STATUS_OPTIONS[hash % STATUS_OPTIONS.length];
}

// 결정론적 닉네임 생성 (기본값이 없을 경우)
function getDeterministicNickname(userId: string): string {
  const hash = hashUserId(userId);
  const index = hash % 10000; // 4자리 숫자
  return `유저${index.toString().padStart(4, '0')}`;
}

async function getAllAuthUsers() {
  console.log('🔍 모든 auth.users 조회 중 (페이지네이션 처리)...');
  
  const allUsers: any[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000, // 한 페이지에 최대 1000명
    });
    
    if (error) {
      console.error('❌ 조회 실패:', error.message);
      throw error;
    }
    
    if (data.users && data.users.length > 0) {
      allUsers.push(...data.users);
      console.log(`   페이지 ${page}: ${data.users.length}명`);
      page++;
      
      // 더 이상 데이터가 없으면 중단
      if (data.users.length < 1000) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  
  console.log(`✅ 총 ${allUsers.length}명 조회 완료`);
  return allUsers;
}

async function restoreUserProfile(user: any) {
  const userId = user.id;
  const email = user.email;
  
  try {
    // 1. user_profiles가 이미 있는지 확인
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (existingProfile) {
      // 이미 존재하면 스킵
      return { userId, email, status: 'skip', reason: 'already exists' };
    }
    
    // 2. 닉네임 생성 (user_metadata > 결정론적 생성)
    // ⚠️ 중복 방지: user_metadata 우선, 없으면 user_id 기반 결정론적 생성
    const nickname = user.user_metadata?.nickname || 
                     user.user_metadata?.name || 
                     getDeterministicNickname(userId);
    
    // 3. user_profiles 생성 (결정론적 데이터)
    // ⚠️ 항상 동일한 user_id는 동일한 값 생성
    const temperatureScore = getDeterministicTemperature(userId);
    const tier = getTierFromTemperature(temperatureScore);
    
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        nickname,
        animal_type: 'unknown', // Cold Start 상태
        tier,
        temperature_score: temperatureScore,
        bio: `안녕하세요! ${nickname}입니다. 함께 게임해요! 🎮`,
        avatar_url: user.user_metadata?.avatar_url || null,
      });
    
    if (profileError) {
      return { userId, email, status: 'error', reason: profileError.message };
    }
    
    // 4. user_settings 생성
    const { error: settingsError } = await supabase
      .from('user_settings')
      .insert({
        id: userId,
        theme_mode: 'dark',
        notification_push: true,
        notification_chat: true,
        notification_party: true,
        language: 'ko',
      });
    
    if (settingsError && settingsError.code !== '23505') { // 중복 에러는 무시
      return { userId, email, status: 'error', reason: `Settings: ${settingsError.message}` };
    }
    
    // 5. user_status 생성 (결정론적)
    // ⚠️ user_id 기반 결정론적 생성 (재실행 시 동일한 값)
    const status = getDeterministicStatus(userId);
    const { error: statusError } = await supabase
      .from('user_status')
      .upsert({
        user_id: userId,
        status,
      }, { onConflict: 'user_id' });
    
    if (statusError) {
      return { userId, email, status: 'error', reason: `Status: ${statusError.message}` };
    }
    
    return { userId, email, status: 'restored', nickname, tier };
  } catch (error) {
    return { 
      userId, 
      email, 
      status: 'error', 
      reason: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function main() {
  console.log('🔧 User Profiles 복구 시작...');
  console.log('');
  
  try {
    // 1. 모든 auth.users 조회 (페이지네이션 처리)
    const allUsers = await getAllAuthUsers();
    console.log('');
    
    // 2. 각 유저별로 복구
    console.log('🔄 User Profiles 복구 중...');
    console.log('');
    
    const results: any[] = [];
    let restored = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const user of allUsers) {
      const result = await restoreUserProfile(user);
      results.push(result);
      
      if (result.status === 'restored') {
        console.log(`✅ [${user.email}] 복구 완료 (${result.nickname}, ${result.tier})`);
        restored++;
      } else if (result.status === 'skip') {
        skipped++;
      } else {
        console.error(`❌ [${user.email}] 실패: ${result.reason}`);
        failed++;
      }
      
      // Rate limiting 방지
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    
    console.log('');
    console.log('='.repeat(70));
    console.log('✅ 복구 완료!');
    console.log('');
    console.log(`📊 통계:`);
    console.log(`   전체 auth.users: ${allUsers.length}명`);
    console.log(`   복구 완료: ${restored}명`);
    console.log(`   이미 존재: ${skipped}명`);
    console.log(`   실패: ${failed}명`);
    console.log('='.repeat(70));
    console.log('');
    console.log('💡 다음 단계:');
    console.log('  1. 개발 서버 재시작');
    console.log('  2. 사용자들에게 성향분석 테스트 진행 안내');
    console.log('  3. Steam 연동 안내');
    
  } catch (error) {
    console.error('');
    console.error('💥 오류 발생:', error);
    process.exit(1);
  }
}

main();


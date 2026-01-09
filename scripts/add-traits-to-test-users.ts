/**
 * Add Traits to Test Users Script
 * 
 * test26~150 계정(125개)에 user_traits와 user_play_schedules 추가
 * - Cold Start (test1~25): 건너뜀
 * - 성향분석 완료 (test26~150): traits + schedules 생성
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { AnimalType, ANIMAL_VECTORS } from '../src/commons/constants/animal/animal.vector';

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

const COLD_START_COUNT = 25; // test1~25

/**
 * 동물 타입에 맞는 traits 생성 (편차 추가)
 */
function generateTraitsForAnimal(animalType: AnimalType): {
  cooperation: number;
  exploration: number;
  strategy: number;
  leadership: number;
  social: number;
} {
  const baseTraits = ANIMAL_VECTORS[animalType] || {
    cooperation: 50,
    exploration: 50,
    strategy: 50,
    leadership: 50,
    social: 50,
  };

  // 각 특성에 ±10 범위의 편차 추가 (0-100 범위 유지)
  const addVariation = (value: number): number => {
    const variation = Math.floor(Math.random() * 21) - 10; // -10 ~ +10
    return Math.max(0, Math.min(100, value + variation));
  };

  return {
    cooperation: addVariation(baseTraits.cooperation),
    exploration: addVariation(baseTraits.exploration),
    strategy: addVariation(baseTraits.strategy),
    leadership: addVariation(baseTraits.leadership),
    social: addVariation(baseTraits.social),
  };
}

/**
 * 랜덤 플레이 스케줄 생성 (중복 방지)
 */
function generatePlaySchedules(): Array<{ day_type: string; time_slot: string }> {
  const dayTypes = ['weekday', 'weekend'];
  const timeSlots = ['dawn', 'morning', 'afternoon', 'evening'];
  
  // 모든 조합 생성
  const allCombinations = dayTypes.flatMap(dayType =>
    timeSlots.map(timeSlot => ({ day_type: dayType, time_slot: timeSlot }))
  );

  // 랜덤하게 2-4개 선택
  const count = Math.floor(Math.random() * 3) + 2; // 2-4개
  const shuffled = allCombinations.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
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

async function addTraitsToUser(userId: string, email: string, animalType: string) {
  try {
    // 1. 이미 traits가 있는지 확인
    const { data: existingTraits } = await supabase
      .from('user_traits')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingTraits) {
      return { success: true, email, status: 'skip', reason: 'already exists' };
    }

    // 2. animal_type에 맞는 traits 생성
    const traits = generateTraitsForAnimal(animalType as AnimalType);

    const { error: traitsError } = await supabase
      .from('user_traits')
      .upsert({
        user_id: userId,
        ...traits,
      }, { onConflict: 'user_id' });

    if (traitsError) {
      console.error(`❌ [${email}] Traits 생성 실패:`, traitsError.message);
      return { success: false, email, status: 'error', reason: traitsError.message };
    }

    // 3. play_schedules 생성
    const schedules = generatePlaySchedules();
    const scheduleRows = schedules.map(s => ({ user_id: userId, ...s }));

    const { error: schedulesError } = await supabase
      .from('user_play_schedules')
      .insert(scheduleRows);

    if (schedulesError) {
      console.error(`❌ [${email}] Schedules 생성 실패:`, schedulesError.message);
      return { success: false, email, status: 'error', reason: schedulesError.message };
    }

    console.log(`✅ [${email}] Traits + Schedules 생성 (${animalType}, ${schedules.length}개 시간대)`);
    return { success: true, email, status: 'created', animalType, scheduleCount: schedules.length };
  } catch (error) {
    console.error(`❌ [${email}] 예상치 못한 오류:`, error);
    return { success: false, email, status: 'error', reason: String(error) };
  }
}

async function main() {
  console.log('🚀 테스트 계정 Traits 추가 시작...');
  console.log('');
  console.log(`📊 대상: test${COLD_START_COUNT + 1}~test150 (${150 - COLD_START_COUNT}명)`);
  console.log(`❄️  건너뜀: test1~test${COLD_START_COUNT} (Cold Start)`);
  console.log('');

  // 1. 모든 auth.users 조회
  const allUsers = await getAllAuthUsers();
  console.log('');

  // 2. test26~test150 필터링
  const testUsers = allUsers.filter(u => {
    const email = u.email || '';
    const match = email.match(/^test(\d+)@readygo\.test$/);
    if (!match) return false;
    
    const index = parseInt(match[1], 10);
    return index > COLD_START_COUNT && index <= 150;
  });

  console.log(`🎯 대상 계정: ${testUsers.length}명`);
  console.log('');

  if (testUsers.length === 0) {
    console.log('✅ 처리할 계정이 없습니다.');
    return;
  }

  // 3. user_profiles 조회 (animal_type 확인)
  const userIds = testUsers.map(u => u.id);
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, animal_type')
    .in('id', userIds);

  if (profilesError) {
    console.error('❌ user_profiles 조회 실패:', profilesError.message);
    return;
  }

  console.log(`📊 user_profiles 조회: ${profiles?.length || 0}명`);
  console.log('');

  // 4. 각 사용자별로 traits + schedules 추가
  console.log('🔄 Traits + Schedules 생성 중...');
  console.log('');

  const results = [];
  for (const profile of profiles || []) {
    const user = testUsers.find(u => u.id === profile.id);
    if (!user) continue;

    const result = await addTraitsToUser(
      profile.id,
      user.email || 'unknown',
      profile.animal_type || AnimalType.unknown
    );
    results.push(result);
  }

  // 5. 결과 요약
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Traits 추가 완료!');
  console.log('');

  const createdCount = results.filter(r => r.status === 'created').length;
  const skipCount = results.filter(r => r.status === 'skip').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  console.log('📊 통계:');
  console.log(`   대상 계정: ${testUsers.length}명`);
  console.log(`   생성 완료: ${createdCount}명`);
  console.log(`   이미 존재: ${skipCount}명`);
  console.log(`   실패: ${errorCount}명`);
  console.log('='.repeat(60));
  console.log('');

  if (errorCount > 0) {
    console.log('❌ 실패한 계정:');
    results
      .filter(r => r.status === 'error')
      .forEach(r => {
        console.log(`   - ${r.email}: ${r.reason}`);
      });
    console.log('');
  }

  console.log('💡 다음 단계:');
  console.log('  1. npm run seed:check 으로 확인');
  console.log('  2. Steam 연동: npm run seed:steam (선택)');
}

main();


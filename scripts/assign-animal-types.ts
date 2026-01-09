/**
 * Assign Animal Types Script
 * 
 * test26~150 계정(125개)에 animal_type 할당 + traits 재생성
 * 1. 랜덤하게 animal_type 할당 (unknown 제외)
 * 2. 해당 animal_type에 맞는 traits 재생성
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { AnimalType } from '../src/commons/constants/animal/animal.enum';
import { ANIMAL_VECTORS } from '../src/commons/constants/animal/animal.vector';

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
 * unknown을 제외한 모든 동물 타입
 */
const ANIMAL_TYPES = Object.values(AnimalType).filter(a => a !== AnimalType.unknown);

/**
 * 랜덤 동물 타입 선택
 */
function getRandomAnimalType(): AnimalType {
  return ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
}

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

async function assignAnimalTypeAndTraits(userId: string, email: string) {
  try {
    // 1. 랜덤 animal_type 선택
    const animalType = getRandomAnimalType();

    // 2. user_profiles 업데이트 (animal_type)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ animal_type: animalType })
      .eq('id', userId);

    if (profileError) {
      console.error(`❌ [${email}] Profile 업데이트 실패:`, profileError.message);
      return { success: false, email, animalType: null, error: profileError.message };
    }

    // 3. 해당 animal_type에 맞는 traits 생성
    const traits = generateTraitsForAnimal(animalType);

    const { error: traitsError } = await supabase
      .from('user_traits')
      .upsert({
        user_id: userId,
        ...traits,
      }, { onConflict: 'user_id' });

    if (traitsError) {
      console.error(`❌ [${email}] Traits 업데이트 실패:`, traitsError.message);
      return { success: false, email, animalType, error: traitsError.message };
    }

    console.log(`✅ [${email}] ${animalType} 할당 + Traits 재생성`);
    return { success: true, email, animalType };
  } catch (error) {
    console.error(`❌ [${email}] 예상치 못한 오류:`, error);
    return { success: false, email, animalType: null, error: String(error) };
  }
}

async function main() {
  console.log('🚀 Animal Type 할당 + Traits 재생성 시작...');
  console.log('');
  console.log(`📊 대상: test${COLD_START_COUNT + 1}~test150 (${150 - COLD_START_COUNT}명)`);
  console.log(`❄️  건너뜀: test1~test${COLD_START_COUNT} (Cold Start)`);
  console.log('');
  console.log(`🦊 사용 가능한 동물: ${ANIMAL_TYPES.length}종류`);
  console.log(`   ${ANIMAL_TYPES.join(', ')}`);
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

  // 3. 각 사용자별로 animal_type 할당 + traits 재생성
  console.log('🔄 Animal Type 할당 + Traits 재생성 중...');
  console.log('');

  const results = [];
  for (const user of testUsers) {
    const result = await assignAnimalTypeAndTraits(user.id, user.email || 'unknown');
    results.push(result);
  }

  // 4. 결과 요약
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Animal Type 할당 완료!');
  console.log('');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  // 동물 타입별 분포
  const animalDistribution: Record<string, number> = {};
  results
    .filter(r => r.success && r.animalType)
    .forEach(r => {
      animalDistribution[r.animalType!] = (animalDistribution[r.animalType!] || 0) + 1;
    });

  console.log('📊 통계:');
  console.log(`   대상 계정: ${testUsers.length}명`);
  console.log(`   성공: ${successCount}명`);
  console.log(`   실패: ${failCount}명`);
  console.log('');
  console.log('🦊 동물 타입 분포:');
  Object.entries(animalDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([animal, count]) => {
      console.log(`   ${animal}: ${count}명`);
    });
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
  console.log('  1. npm run seed:check 으로 확인');
  console.log('  2. Steam 연동: npm run seed:steam (선택)');
  console.log('  3. 매칭 테스트 가능!');
}

main();


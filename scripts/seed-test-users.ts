/**
 * Test Users Seed Script
 * 
 * 100-200명의 테스트 계정 생성
 * - Supabase Admin API 사용
 * - auth.users + user_profiles 동시 생성
 * - 다양한 성향/게임 데이터 포함
 */

import { createClient } from '@supabase/supabase-js';
import { generateNickname } from '../src/lib/nickname/generateNickname';
import { ANIMAL_VECTORS, type TraitVector } from '../src/commons/constants/animal/animal.vector';
import { AnimalType } from '../src/commons/constants/animal/animal.enum';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 동물 타입 목록 (벡터가 정의된 동물만)
const ANIMAL_TYPES = Object.keys(ANIMAL_VECTORS) as AnimalType[];

/**
 * 동물 타입에 맞는 성향 점수 생성
 * - 각 동물의 이상적 벡터를 기준으로 ±10 변동
 * - 실제 유저처럼 약간의 편차가 있는 자연스러운 값 생성
 */
function generateTraitsForAnimal(animalType: AnimalType): TraitVector {
  const baseVector = ANIMAL_VECTORS[animalType];
  
  if (!baseVector) {
    // 벡터가 없는 경우 (예: unknown) 랜덤 값 생성
    return {
      cooperation: Math.floor(Math.random() * 61) + 30,
      exploration: Math.floor(Math.random() * 61) + 30,
      strategy: Math.floor(Math.random() * 61) + 30,
      leadership: Math.floor(Math.random() * 61) + 30,
      social: Math.floor(Math.random() * 61) + 30,
    };
  }
  
  // 기본 벡터에 ±10 변동 추가
  const addVariation = (baseValue: number): number => {
    const variation = Math.floor(Math.random() * 21) - 10; // -10 ~ +10
    const result = baseValue + variation;
    // 0-100 범위로 clamp
    return Math.max(0, Math.min(100, result));
  };
  
  return {
    cooperation: addVariation(baseVector.cooperation),
    exploration: addVariation(baseVector.exploration),
    strategy: addVariation(baseVector.strategy),
    leadership: addVariation(baseVector.leadership),
    social: addVariation(baseVector.social),
  };
}

// 랜덤 시간대 생성
function generatePlaySchedules(): Array<{ day_type: string; time_slot: string }> {
  const dayTypes = ['weekday', 'weekend'];
  const timeSlots = ['dawn', 'morning', 'afternoon', 'evening'];
  const schedules: Array<{ day_type: string; time_slot: string }> = [];
  
  // 랜덤으로 2-4개 시간대 선택
  const count = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < count; i++) {
    schedules.push({
      day_type: dayTypes[Math.floor(Math.random() * dayTypes.length)],
      time_slot: timeSlots[Math.floor(Math.random() * timeSlots.length)],
    });
  }
  
  return schedules;
}

// 테스트 유저 생성
async function createTestUser(index: number) {
  const email = `test${index}@readygo.test`;
  const password = 'Test1234!';
  const nickname = generateNickname(8); // 최대 8글자 한국어 닉네임 (예: "귀여운고양이")
  const animalType = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];

  try {
    // 1. Auth 유저 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 스킵
      user_metadata: {
        nickname,
      },
    });

    if (authError) {
      console.error(`❌ [${index}] Auth 생성 실패:`, authError.message);
      return null;
    }

    const userId = authData.user.id;

    // 2. User Profile 생성
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        nickname,
        animal_type: animalType,
        tier: 'bronze',
        temperature_score: Math.floor(Math.random() * 20) + 30, // 30-50
        bio: `안녕하세요! ${nickname}입니다. 함께 게임해요! 🎮`,
      });

    if (profileError) {
      console.error(`❌ [${index}] Profile 생성 실패:`, profileError.message);
      return null;
    }

    // 3. User Traits 생성 (동물 타입에 맞는 성향)
    const traits = generateTraitsForAnimal(animalType as AnimalType);
    const { error: traitsError } = await supabase
      .from('user_traits')
      .insert({
        user_id: userId,
        ...traits,
      });

    if (traitsError) {
      console.error(`❌ [${index}] Traits 생성 실패:`, traitsError.message);
      return null;
    }

    // 4. Play Schedules 생성
    const schedules = generatePlaySchedules();
    const { error: schedulesError } = await supabase
      .from('user_play_schedules')
      .insert(
        schedules.map((s) => ({
          user_id: userId,
          ...s,
        }))
      );

    if (schedulesError) {
      console.error(`❌ [${index}] Schedules 생성 실패:`, schedulesError.message);
      return null;
    }

    console.log(`✅ [${index}] ${email} (${nickname}, ${animalType})`);
    return userId;

  } catch (error) {
    console.error(`❌ [${index}] 예외 발생:`, error);
    return null;
  }
}

// 메인 함수
async function main() {
  const START = 1;
  const END = 150; // 150명 생성
  const BATCH_SIZE = 10; // 10명씩 배치 처리

  console.log('🚀 테스트 유저 생성 시작...');
  console.log(`📊 생성 범위: test${START}@readygo.test ~ test${END}@readygo.test`);
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (let i = START; i <= END; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE - 1, END);
    console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}: test${i} ~ test${batchEnd}`);

    const promises = [];
    for (let j = i; j <= batchEnd; j++) {
      promises.push(createTestUser(j));
    }

    const results = await Promise.all(promises);
    successCount += results.filter((r) => r !== null).length;
    failCount += results.filter((r) => r === null).length;

    // Rate limiting 방지: 배치 간 1초 대기
    if (batchEnd < END) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log('\n');
  console.log('=' .repeat(50));
  console.log('✅ 완료!');
  console.log(`성공: ${successCount}명`);
  console.log(`실패: ${failCount}명`);
  console.log('=' .repeat(50));
}

main().catch(console.error);


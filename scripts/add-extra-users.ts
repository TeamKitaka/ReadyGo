/**
 * Add Extra Users Script
 * 
 * test151~test178 (28명) 추가 생성
 * - 실패한 계정 대신 새 번호로 생성
 * - 성향분석 완료 상태
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { generateNickname } from '../src/lib/nickname/generateNickname';
import { ANIMAL_VECTORS, type TraitVector } from '../src/commons/constants/animal/animal.vector';
import { AnimalType } from '../src/commons/constants/animal/animal.enum';
import { getTierFromTemperature, getRandomTemperatureByTier } from './utils/tierMapping';

// .env.local 파일 명시적으로 로드
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

const ANIMAL_TYPES = Object.values(AnimalType).filter(
  (type) => type !== AnimalType.unknown
);

const STATUS_OPTIONS = ['online', 'offline', 'away'] as const;

// 동물 성향 생성
function generateTraitsForAnimal(animalType: AnimalType): TraitVector {
  const baseVector = ANIMAL_VECTORS[animalType];
  
  if (!baseVector) {
    return {
      cooperation: 50,
      exploration: 50,
      strategy: 50,
      leadership: 50,
      social: 50,
    };
  }
  
  const addVariation = (baseValue: number): number => {
    const variation = Math.floor(Math.random() * 21) - 10;
    const result = baseValue + variation;
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

// 랜덤 시간대 생성 (중복 제거)
function generatePlaySchedules(): Array<{ day_type: string; time_slot: string }> {
  const dayTypes = ['weekday', 'weekend'];
  const timeSlots = ['dawn', 'morning', 'afternoon', 'evening'];
  
  const allCombinations = dayTypes.flatMap(dayType =>
    timeSlots.map(timeSlot => ({ day_type: dayType, time_slot: timeSlot }))
  );
  
  const count = Math.floor(Math.random() * 3) + 2; // 2-4
  const shuffled = allCombinations.sort(() => Math.random() - 0.5);
  
  return shuffled.slice(0, count);
}

// 유저 생성
async function createUser(index: number) {
  const email = `test${index}@readygo.test`;
  const password = 'Test1234!';
  const nickname = generateNickname(8);
  const animalType = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
  const randomStatus = STATUS_OPTIONS[Math.floor(Math.random() * STATUS_OPTIONS.length)];
  
  try {
    // 1. Auth 유저 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nickname },
    });

    if (authError) {
      console.error(`❌ [${index}] Auth 생성 실패:`, authError.message);
      return false;
    }

    const userId = authData.user.id;

    // 2. User Profile 생성
    const temperatureScore = getRandomTemperatureByTier(); // 각 티어별로 균등 분포
    const tier = getTierFromTemperature(temperatureScore);
    
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        nickname,
        animal_type: animalType,
        tier,
        temperature_score: temperatureScore,
        bio: `안녕하세요! ${nickname}입니다. 함께 게임해요! 🎮`,
      });

    if (profileError) {
      console.error(`❌ [${index}] Profile 생성 실패:`, profileError.message);
      return false;
    }

    // 3. User Settings 생성
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

    if (settingsError) {
      console.error(`❌ [${index}] Settings 생성 실패:`, settingsError.message);
      return false;
    }

    // 4. User Status 생성
    const { error: statusError } = await supabase
      .from('user_status')
      .upsert({
        user_id: userId,
        status: randomStatus,
      }, { onConflict: 'user_id' });

    if (statusError) {
      console.error(`❌ [${index}] Status 생성 실패:`, statusError.message);
      return false;
    }

    // 5. User Traits 생성
    const traits = generateTraitsForAnimal(animalType as AnimalType);
    const { error: traitsError } = await supabase
      .from('user_traits')
      .insert({
        user_id: userId,
        ...traits,
      });

    if (traitsError) {
      console.error(`❌ [${index}] Traits 생성 실패:`, traitsError.message);
      return false;
    }

    // 6. Play Schedules 생성
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
      return false;
    }

    console.log(`✅ [${index}] ${email} (${nickname}, ${animalType}, ${tier}, ${randomStatus})`);
    return true;
  } catch (error) {
    console.error(`❌ [${index}] 예상치 못한 오류:`, error);
    return false;
  }
}

// 메인 함수
async function main() {
  const START = 151;
  const END = 178; // 28명 추가 (151~178)
  
  console.log('🚀 추가 계정 생성 시작...');
  console.log(`📊 생성 범위: test${START}@readygo.test ~ test${END}@readygo.test (${END - START + 1}명)`);
  console.log('🎯 성향분석 완료 상태 + Steam 연동 예정');
  console.log('');
  
  let successCount = 0;
  let failCount = 0;
  
  // 순차 처리
  for (let i = START; i <= END; i++) {
    const success = await createUser(i);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Rate limiting 방지
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  
  console.log('');
  console.log('=' .repeat(60));
  console.log('✅ 생성 완료!');
  console.log(`성공: ${successCount}명`);
  console.log(`실패: ${failCount}명`);
  console.log('=' .repeat(60));
  console.log('');
  console.log('📊 최종 통계:');
  console.log('  - Cold Start (test1~25): 25명');
  console.log('  - 성향분석 완료 (test26~150 중 성공): ~106명');
  console.log('  - 성향분석 완료 (test151~178 신규): 28명');
  console.log('  - 예상 총 인원: ~159명');
  console.log('');
  console.log('💡 다음 단계:');
  console.log('  1. npm run seed:redistribute-tier (티어 재배분)');
  console.log('  2. npm run dev (개발 서버 실행)');
  console.log('  3. npm run seed:steam (Steam 연동, test26~125)');
}

main();


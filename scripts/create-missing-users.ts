/**
 * Create Missing Users Script
 * 
 * auth.users가 생성되지 않은 계정들을 처음부터 새로 생성
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { generateNickname } from '../src/lib/nickname/generateNickname';
import { ANIMAL_VECTORS, type TraitVector } from '../src/commons/constants/animal/animal.vector';
import { AnimalType } from '../src/commons/constants/animal/animal.enum';
import { getTierFromTemperature, getRandomTemperature } from './utils/tierMapping';

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

// 생성되지 않은 계정 번호들
const MISSING_USERS = [
  26, 28, 29, 34, 35, 36, 40, 43, 45, 49,
  51, 52, 60, 64, 68, 69, 70, 71, 73, 74,
  81, 86, 89, 90, 91, 94, 96, 99
];

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
async function createMissingUser(index: number) {
  const email = `test${index}@readygo.test`;
  const password = 'Test1234!';
  const nickname = generateNickname(8);
  const animalType = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
  const randomStatus = STATUS_OPTIONS[Math.floor(Math.random() * STATUS_OPTIONS.length)];
  
  try {
    // 1. 이미 존재하는지 확인
    const { data: existingAuth } = await supabase.auth.admin.listUsers();
    const exists = existingAuth?.users?.some(u => u.email === email);
    
    if (exists) {
      console.log(`⏭️  [${index}] ${email} - 이미 존재합니다.`);
      return true;
    }
    
    // 2. Auth 유저 생성
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

    // 3. User Profile 생성
    const temperatureScore = getRandomTemperature();
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

    // 4. User Settings 생성
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

    // 5. User Status 생성
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

    // 6. User Traits 생성
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

    // 7. Play Schedules 생성
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
  console.log('🚀 누락된 계정 생성 시작...');
  console.log(`📊 생성 대상: ${MISSING_USERS.length}명`);
  console.log('');
  
  let successCount = 0;
  let failCount = 0;
  
  // 순차 처리 (Rate limiting 방지)
  for (const index of MISSING_USERS) {
    const success = await createMissingUser(index);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Rate limiting 방지: 각 요청 간 500ms 대기
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  
  console.log('');
  console.log('=' .repeat(60));
  console.log('✅ 생성 완료!');
  console.log(`성공: ${successCount}명`);
  console.log(`실패: ${failCount}명`);
  console.log('=' .repeat(60));
}

main();


/**
 * Fix Failed Users Script
 * 
 * user_play_schedules 생성 실패한 계정들에게
 * user_traits와 user_play_schedules 데이터 추가
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { ANIMAL_VECTORS, type TraitVector } from '../src/commons/constants/animal/animal.vector';
import { AnimalType } from '../src/commons/constants/animal/animal.enum';

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

// 실패한 계정 번호들 (로그에서 추출)
const FAILED_USERS = [
  26, 28, 29, 34, 35, 36, 40, 43, 45, 49,
  51, 52, 60, 64, 68, 69, 70, 71, 73, 74,
  81, 86, 89, 90, 91, 94, 96, 99, 103, 108,
  110, 111, 113, 114, 115, 117, 120, 122, 123, 124,
  127, 135, 138, 141
];

// 동물 성향 생성
function generateTraitsForAnimal(animalType: AnimalType): TraitVector {
  const baseVector = ANIMAL_VECTORS[animalType];
  
  if (!baseVector) {
    // Fallback to default values
    return {
      cooperation: 50,
      exploration: 50,
      strategy: 50,
      leadership: 50,
      social: 50,
    };
  }
  
  const addVariation = (baseValue: number): number => {
    const variation = Math.floor(Math.random() * 21) - 10; // -10 ~ +10
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
  
  // 모든 가능한 조합 생성
  const allCombinations = dayTypes.flatMap(dayType =>
    timeSlots.map(timeSlot => ({ day_type: dayType, time_slot: timeSlot }))
  );
  
  // 랜덤으로 2-4개 시간대 선택 (중복 없이)
  const count = Math.floor(Math.random() * 3) + 2; // 2-4
  const shuffled = allCombinations.sort(() => Math.random() - 0.5);
  
  return shuffled.slice(0, count);
}

// 실패한 유저 수정
async function fixFailedUser(index: number) {
  const email = `test${index}@readygo.test`;
  
  try {
    // 1. Auth에서 userId 조회
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error(`❌ [${index}] Auth 조회 실패:`, authError.message);
      return false;
    }
    
    const user = authData.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ [${index}] ${email} - 유저를 찾을 수 없습니다.`);
      return false;
    }
    
    const userId = user.id;
    
    // 2. user_profiles에서 animal_type 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('animal_type')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) {
      console.error(`❌ [${index}] Profile 조회 실패`);
      return false;
    }
    
    const animalType = profile.animal_type as AnimalType;
    
    // 3. user_traits가 이미 있는지 확인
    const { data: existingTraits } = await supabase
      .from('user_traits')
      .select('user_id')
      .eq('user_id', userId)
      .single();
    
    if (!existingTraits) {
      // user_traits 생성
      const traits = generateTraitsForAnimal(animalType);
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
    }
    
    // 4. user_play_schedules 삭제 후 재생성
    // 기존 중복 데이터가 있을 수 있으므로 먼저 삭제
    await supabase
      .from('user_play_schedules')
      .delete()
      .eq('user_id', userId);
    
    // 새로운 schedules 생성
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
    
    console.log(`✅ [${index}] ${email} (${animalType}) - 복구 완료`);
    return true;
  } catch (error) {
    console.error(`❌ [${index}] 예상치 못한 오류:`, error);
    return false;
  }
}

// 메인 함수
async function main() {
  console.log('🔧 실패한 계정 복구 시작...');
  console.log(`📊 복구 대상: ${FAILED_USERS.length}명`);
  console.log('');
  
  let successCount = 0;
  let failCount = 0;
  
  // 순차 처리 (Rate limiting 방지)
  for (const index of FAILED_USERS) {
    const success = await fixFailedUser(index);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Rate limiting 방지: 각 요청 간 200ms 대기
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  
  console.log('');
  console.log('=' .repeat(60));
  console.log('✅ 복구 완료!');
  console.log(`성공: ${successCount}명`);
  console.log(`실패: ${failCount}명`);
  console.log('=' .repeat(60));
}

main();


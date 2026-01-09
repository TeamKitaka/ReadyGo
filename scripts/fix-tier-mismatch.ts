/**
 * Fix Tier Mismatch Script
 * 
 * temperature_score와 tier가 맞지 않는 user_profiles 수정
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getTierFromTemperature } from './utils/tierMapping';

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

async function main() {
  console.log('🔧 Tier 불일치 수정 시작...');
  console.log('');

  try {
    // 1. 모든 user_profiles 조회
    const { data: profiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, nickname, temperature_score, tier');

    if (fetchError) {
      console.error('❌ Profiles 조회 실패:', fetchError.message);
      process.exit(1);
    }

    if (!profiles || profiles.length === 0) {
      console.log('📊 조회된 프로필이 없습니다.');
      return;
    }

    console.log(`📊 총 ${profiles.length}명의 프로필 조회`);
    console.log('');

    // 2. 불일치 항목 찾기
    const mismatches = profiles.filter(profile => {
      const correctTier = getTierFromTemperature(profile.temperature_score);
      return profile.tier !== correctTier;
    });

    if (mismatches.length === 0) {
      console.log('✅ 모든 프로필이 올바르게 설정되어 있습니다!');
      return;
    }

    console.log(`⚠️  불일치 발견: ${mismatches.length}명`);
    console.log('');

    // 3. 수정
    let successCount = 0;
    let failCount = 0;

    for (const profile of mismatches) {
      const correctTier = getTierFromTemperature(profile.temperature_score);
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ tier: correctTier })
        .eq('id', profile.id);

      if (updateError) {
        console.error(`❌ [${profile.nickname}] 업데이트 실패:`, updateError.message);
        failCount++;
      } else {
        console.log(
          `✅ [${profile.nickname}] ${profile.tier} → ${correctTier} (온도: ${profile.temperature_score})`
        );
        successCount++;
      }

      // Rate limiting 방지
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('');
    console.log('=' .repeat(60));
    console.log('✅ 수정 완료!');
    console.log(`성공: ${successCount}명`);
    console.log(`실패: ${failCount}명`);
    console.log('=' .repeat(60));

    // 4. 티어별 통계 출력
    console.log('');
    console.log('📊 티어별 분포:');
    
    const { data: updatedProfiles } = await supabase
      .from('user_profiles')
      .select('tier');

    if (updatedProfiles) {
      const tierCounts: Record<string, number> = {};
      updatedProfiles.forEach(p => {
        tierCounts[p.tier] = (tierCounts[p.tier] || 0) + 1;
      });

      const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'champion'];
      tierOrder.forEach(tier => {
        const count = tierCounts[tier] || 0;
        if (count > 0) {
          console.log(`  ${tier.padEnd(10)}: ${count}명`);
        }
      });
    }

  } catch (error) {
    console.error('');
    console.error('💥 오류 발생:', error);
    process.exit(1);
  }
}

main();


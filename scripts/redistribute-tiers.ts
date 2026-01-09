/**
 * Redistribute Tiers Script
 * 
 * 기존 계정들의 tier를 골고루 재배분
 * 각 티어별로 균등하게 분포시킴
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getTierFromTemperature, getRandomTemperatureByTier, type TierType } from './utils/tierMapping';

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
  console.log('🔄 Tier 재배분 시작...');
  console.log('');

  try {
    // 1. 모든 user_profiles 조회
    const { data: profiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, nickname, temperature_score, tier')
      .order('id');

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

    // 2. 각 티어별로 목표 개수 계산
    const tierOrder: TierType[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'champion'];
    const targetPerTier = Math.floor(profiles.length / tierOrder.length);
    const remainder = profiles.length % tierOrder.length;

    console.log('🎯 목표 티어 분포:');
    tierOrder.forEach((tier, index) => {
      const target = targetPerTier + (index < remainder ? 1 : 0);
      console.log(`  ${tier.padEnd(10)}: ${target}명`);
    });
    console.log('');

    // 3. 각 프로필에 새로운 temperature_score와 tier 할당
    console.log('🔄 Tier 재배분 중...');
    let successCount = 0;
    let failCount = 0;

    for (const profile of profiles) {
      const newTemperatureScore = getRandomTemperatureByTier();
      const newTier = getTierFromTemperature(newTemperatureScore);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          temperature_score: newTemperatureScore,
          tier: newTier,
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error(`❌ [${profile.nickname}] 업데이트 실패:`, updateError.message);
        failCount++;
      } else {
        if (profile.tier !== newTier) {
          console.log(
            `✅ [${profile.nickname}] ${profile.tier} → ${newTier} (온도: ${profile.temperature_score} → ${newTemperatureScore})`
          );
        }
        successCount++;
      }

      // Rate limiting 방지
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('');
    console.log('=' .repeat(60));
    console.log('✅ 재배분 완료!');
    console.log(`성공: ${successCount}명`);
    console.log(`실패: ${failCount}명`);
    console.log('=' .repeat(60));

    // 4. 최종 티어별 통계 출력
    console.log('');
    console.log('📊 최종 티어별 분포:');

    const { data: updatedProfiles } = await supabase
      .from('user_profiles')
      .select('tier, temperature_score');

    if (updatedProfiles) {
      const tierCounts: Record<string, { count: number; minTemp: number; maxTemp: number }> = {};

      tierOrder.forEach(tier => {
        const tierProfiles = updatedProfiles.filter(p => p.tier === tier);
        if (tierProfiles.length > 0) {
          tierCounts[tier] = {
            count: tierProfiles.length,
            minTemp: Math.min(...tierProfiles.map(p => p.temperature_score)),
            maxTemp: Math.max(...tierProfiles.map(p => p.temperature_score)),
          };
        }
      });

      tierOrder.forEach(tier => {
        const stats = tierCounts[tier];
        if (stats) {
          const percentage = ((stats.count / updatedProfiles.length) * 100).toFixed(1);
          console.log(
            `  ${tier.padEnd(10)}: ${String(stats.count).padStart(3)}명 (${percentage}%) - 온도: ${stats.minTemp}~${stats.maxTemp}`
          );
        } else {
          console.log(`  ${tier.padEnd(10)}: ${String(0).padStart(3)}명 (0.0%)`);
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


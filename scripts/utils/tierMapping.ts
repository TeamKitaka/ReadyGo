/**
 * Temperature Score to Tier Mapping
 * 
 * 온도 점수에 따른 티어 자동 계산
 */

export type TierType = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'champion';

export function getTierFromTemperature(temperature: number): TierType {
  if (temperature >= 95) return 'champion';
  if (temperature >= 88) return 'master';
  if (temperature >= 75) return 'diamond';
  if (temperature >= 60) return 'platinum';
  if (temperature >= 45) return 'gold';
  if (temperature >= 30) return 'silver';
  return 'bronze';
}

export function getRandomTemperature(): number {
  // 0-100 균등 분포 (모든 티어 골고루 분포)
  return Math.floor(Math.random() * 101); // 0-100
}

export function getRandomTemperatureByTier(): number {
  // 각 티어별로 균등하게 배분
  const tiers: TierType[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'champion'];
  const randomTier = tiers[Math.floor(Math.random() * tiers.length)];
  const range = getTemperatureRange(randomTier);
  
  // 해당 티어의 범위 내에서 랜덤 선택
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

export function getTemperatureRange(tier: TierType): { min: number; max: number } {
  switch (tier) {
    case 'champion': return { min: 95, max: 100 };
    case 'master': return { min: 88, max: 94 };
    case 'diamond': return { min: 75, max: 87 };
    case 'platinum': return { min: 60, max: 74 };
    case 'gold': return { min: 45, max: 59 };
    case 'silver': return { min: 30, max: 44 };
    case 'bronze': return { min: 0, max: 29 };
  }
}


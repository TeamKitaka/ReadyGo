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
  // 0-100 랜덤, 정규분포 비슷하게 (중간값 선호)
  const rand1 = Math.random();
  const rand2 = Math.random();
  const normal = (rand1 + rand2) / 2; // 평균 0.5로 정규분포 근사
  
  return Math.floor(normal * 100);
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


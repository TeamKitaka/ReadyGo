/**
 * API 응답 → MatchCardProps 변환
 * 
 * 책임:
 * - API 응답 데이터를 UI 컴포넌트 Props로 변환
 * - reasons에서 UI 표시 정보 추출
 * 
 * 비책임:
 * - 비즈니스 로직 (Service에서 처리)
 * - API 호출 (Hook에서 처리)
 */

import type { MatchCardProps } from '../ui/match-section/card/matchCard';

/**
 * 시간대 타입 → 한글 라벨 변환
 */
const timeTypeLabels: Record<string, string> = {
  morning: '아침 시간대',
  afternoon: '낮 시간대',
  evening: '저녁 시간대',
  lateNight: '밤 시간대',
  weekend: '주말',
  flexible: '유연한 시간대',
};

/**
 * Trait → 한글 라벨 변환
 */
const traitLabels: Record<string, string> = {
  cooperation: '협동형 플레이어',
  exploration: '탐험형 플레이어',
  strategy: '전략형 플레이어',
  leadership: '리더형 플레이어',
  social: '사교형 플레이어',
};

/**
 * API 응답을 MatchCardProps로 변환
 * 
 * reasons를 분석하여 UI 표시용 필드 추출:
 * - 우선순위에 따라 3개 필드를 채움
 * - 부족하면 fallback 값 사용
 * 
 * @param apiResult API 응답 객체
 * @returns MatchCardProps
 */
export function toMatchCardProps(apiResult: any): MatchCardProps {
  let gamePreference: string | undefined;
  let playTime: string | undefined;
  let skillLevel: string | undefined;

  // reasons 분석 (우선순위 순)
  for (const reason of apiResult.reasons || []) {
    const { type } = reason.detail;

    // 1순위: 게임 취향
    if (!gamePreference) {
      if (type === 'COMMON_GAME') {
        gamePreference = reason.detail.topGames?.join(', ');
      } else if (type === 'STEAM_GENRE') {
        gamePreference = `${reason.detail.genre} 장르`;
      } else if (type === 'STEAM_PLAYSTYLE') {
        gamePreference = `${reason.detail.style} 스타일`;
      }
    }

    // 2순위: 플레이 시간대
    if (!playTime) {
      if (type === 'ACTIVITY_PATTERN') {
        const timeType =
          reason.detail.viewerTimeType || reason.detail.targetTimeType;
        playTime = timeTypeLabels[timeType] || '활동 시간';
      } else if (type === 'TIME_OVERLAP') {
        playTime = '비슷한 활동 시간';
      } else if (type === 'PLAYTIME_SIMILARITY') {
        playTime = `주간 ${reason.detail.viewerHours || 0}시간 플레이`;
      }
    }

    // 3순위: 실력/성향
    if (!skillLevel) {
      if (type === 'STYLE_SIMILARITY') {
        const trait = reason.detail.topTrait;
        skillLevel = traitLabels[trait] || '균형잡힌 플레이어';
      } else if (type === 'RELIABILITY') {
        skillLevel = '매너 좋은 플레이어';
      } else if (type === 'PARTY_EXPERIENCE') {
        skillLevel = '파티 경험 풍부';
      } else if (type === 'ANIMAL_COMPATIBILITY') {
        skillLevel = '동물 궁합 좋음';
      }
    }

    // 3개 모두 채워지면 중단
    if (gamePreference && playTime && skillLevel) {
      break;
    }
  }

  // Fallback: 3개 중 채워지지 않은 값이 있으면 기본값 설정
  if (!gamePreference) {
    gamePreference = '다양한 게임 플레이';
  }
  if (!playTime) {
    playTime = '자유로운 시간';
  }
  if (!skillLevel) {
    skillLevel = '긍정적인 플레이어';
  }

  return {
    userId: apiResult.profile.userId,
    nickname: apiResult.profile.nickname,
    matchRate: apiResult.score,
    status: apiResult.status,
    animalType: apiResult.profile.animalType,
    gamePreference,
    playTime,
    skillLevel,
  };
}


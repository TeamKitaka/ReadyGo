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
  morning: '오전 활동',
  afternoon: '오후 활동',
  evening: '저녁 활동',
  lateNight: '심야 활동',
  weekend: '주말 플레이',
  flexible: '유연한 시간',
};

/**
 * Trait → 한글 라벨 변환
 */
const traitLabels: Record<string, string> = {
  cooperation: '팀워크 중시',
  exploration: '탐험 선호',
  strategy: '전략적 플레이',
  leadership: '리더십 발휘',
  social: '소통 중시',
};

/**
 * API 응답을 MatchCardProps로 변환
 * 
 * reasons를 분석하여 UI 표시용 필드 추출:
 * - 우선순위에 따라 3개 필드를 채움
 * - 부족하면 fallback 값 사용
 * - 게임 이름은 이미 service에서 enrichment 완료
 * 
 * @param apiResult API 응답 객체
 * @returns MatchCardProps
 */
export function toMatchCardProps(apiResult: any): MatchCardProps {
  let gamePreference: string | undefined;
  let playTime: string | undefined;
  let skillLevel: string | undefined;

  // 랜덤 순서로 섞기 (다양성 확보)
  const shuffledReasons = [...(apiResult.reasons || [])].sort(() => Math.random() - 0.5);

  // reasons 분석 (랜덤 순)
  for (const reason of shuffledReasons) {
    const { type, detail } = reason;

    // 1순위: 게임 취향 (가장 구체적인 것 우선)
    if (!gamePreference) {
      if (type === 'COMMON_GAME' && detail.topGames?.length > 0) {
        // 실제 게임 이름 표시 (최대 2개)
        const games = detail.topGames.slice(0, 2);
        gamePreference = games.join(', ');
      } else if (type === 'STEAM_GENRE') {
        gamePreference = `${detail.genre} 장르`;
      } else if (type === 'STEAM_PLAYSTYLE') {
        const styleLabels: Record<string, string> = {
          casual: '캐주얼 플레이',
          regular: '규칙적 플레이',
          hardcore: '하드코어 플레이',
        };
        gamePreference = styleLabels[detail.viewerStyle] || `${detail.viewerStyle} 스타일`;
      }
    }

    // 2순위: 플레이 시간대
    if (!playTime) {
      if (type === 'ACTIVITY_PATTERN') {
        const timeType = detail.viewerTimeType || detail.targetTimeType;
        playTime = timeTypeLabels[timeType] || '활동 시간';
      } else if (type === 'TIME_OVERLAP') {
        playTime = '비슷한 활동 시간';
      } else if (type === 'PLAY_TIME' && detail.matchScore >= 60) {
        playTime = `플레이 시간 ${detail.matchScore}% 유사`;
      } else if (type === 'ONLINE_NOW') {
        playTime = '지금 온라인';
      }
    }

    // 3순위: 실력/성향
    if (!skillLevel) {
      if (type === 'STYLE_SIMILARITY') {
        const trait = detail.topTrait;
        skillLevel = traitLabels[trait] || '균형잡힌 스타일';
      } else if (type === 'RELIABILITY' && detail.reliabilityScore >= 60) {
        const score = detail.reliabilityScore;
        if (score >= 90) {
          skillLevel = '신뢰도 최상';
        } else if (score >= 75) {
          skillLevel = '신뢰도 높음';
        } else {
          skillLevel = '매너 좋음';
        }
      } else if (type === 'PARTY_EXPERIENCE') {
        skillLevel = '파티 경험 풍부';
      } else if (type === 'ANIMAL_COMPATIBILITY') {
        skillLevel = '성향 궁합 좋음';
      }
    }

    // 3개 모두 채워지면 중단
    if (gamePreference && playTime && skillLevel) {
      break;
    }
  }

  // Fallback: 3개 중 채워지지 않은 값이 있으면 기본값 설정
  if (!gamePreference) {
    gamePreference = '다양한 게임';
  }
  if (!playTime) {
    playTime = '유연한 시간';
  }
  if (!skillLevel) {
    skillLevel = '긍정적 플레이';
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


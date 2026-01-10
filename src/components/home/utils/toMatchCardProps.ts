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

import type { MatchCardProps, MatchPreference } from '../ui/match-section/card/matchCard';

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
 * reasons를 분석하여 UI 표시용 preferences 생성:
 * - 각 reason에서 icon, label, value를 동적으로 생성
 * - 의미있는 데이터만 표시 (fallback 값은 skip)
 * - 최대 3개의 preferences 반환
 * 
 * @param apiResult API 응답 객체
 * @returns MatchCardProps
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toMatchCardProps = (apiResult: any): MatchCardProps => {
  const preferences: MatchPreference[] = [];

  // 랜덤 순서로 섞기 (다양성 확보)
  const shuffledReasons = [...(apiResult.reasons || [])].sort(() => Math.random() - 0.5);

  // reasons 분석 (랜덤 순)
  for (const reason of shuffledReasons) {
    const { detail } = reason;
    const type = detail?.type;

    // 이미 3개 채워졌으면 중단
    if (preferences.length >= 3) {
      break;
    }

    // BASELINE, RELIABILITY reason은 건너뛰기 (의미없는 기본값)
    if (type === 'BASELINE' || type === 'RELIABILITY' || reason.isBaseline) {
      continue;
    }

    // 게임 관련 이유
    if (type === 'COMMON_GAME' && detail.topGames?.length > 0) {
      // 실제 게임 이름인지 확인 ("Game XXX" 패턴은 skip)
      const validGames = detail.topGames.filter(
        (game: string) => !game.match(/^Game \d+$/)
      );
      
      if (validGames.length > 0) {
        preferences.push({
          icon: 'joystick-alt',
          label: '동일 게임 선호',
          value: validGames.slice(0, 2).join(', '),
        });
      }
    } else if (type === 'STEAM_GENRE' && detail.genre) {
      preferences.push({
        icon: 'joystick-alt',
        label: '선호 장르',
        value: `${detail.genre} 장르`,
      });
    } else if (type === 'STEAM_PLAYSTYLE' && detail.viewerStyle) {
      const styleLabels: Record<string, string> = {
        casual: '캐주얼 플레이',
        regular: '규칙적 플레이',
        hardcore: '하드코어 플레이',
      };
      const styleValue = styleLabels[detail.viewerStyle];
      if (styleValue) {
        preferences.push({
          icon: 'gamepad',
          label: '플레이 스타일',
          value: styleValue,
        });
      }
    }
    // 시간대 관련 이유
    else if (type === 'ACTIVITY_PATTERN' && (detail.viewerTimeType || detail.targetTimeType)) {
      const timeType = detail.viewerTimeType || detail.targetTimeType;
      const timeLabel = timeTypeLabels[timeType];
      if (timeLabel && timeLabel !== '유연한 시간') {
        preferences.push({
          icon: 'time',
          label: '플레이 시간대',
          value: timeLabel,
        });
      }
    } else if (type === 'TIME_OVERLAP') {
      preferences.push({
        icon: 'time',
        label: '활동 시간',
        value: '비슷한 활동 시간',
      });
    } else if (type === 'PLAY_TIME' && detail.matchScore >= 60) {
      preferences.push({
        icon: 'time',
        label: '플레이 시간',
        value: `${detail.matchScore}% 유사`,
      });
    } else if (type === 'ONLINE_NOW') {
      preferences.push({
        icon: 'circle-dot',
        label: '지금',
        value: '온라인 중',
      });
    }
    // 성향/실력 관련 이유
    else if (type === 'STYLE_SIMILARITY' && detail.similarityScore >= 70 && detail.topTrait) {
      const trait = detail.topTrait;
      const traitLabel = traitLabels[trait];
      if (traitLabel) {
        preferences.push({
          icon: 'trophy',
          label: '플레이 성향',
          value: traitLabel,
        });
      }
    } else if (type === 'PARTY_EXPERIENCE') {
      preferences.push({
        icon: 'users',
        label: '파티 경험',
        value: '경험 풍부',
      });
    } else if (type === 'ANIMAL_COMPATIBILITY') {
      preferences.push({
        icon: 'heart',
        label: '성향 궁합',
        value: '궁합 좋음',
      });
    }
  }

  // Fallback: 최소 3개를 보장 (부족하면 기본값 추가)
  const fallbackPreferences: MatchPreference[] = [
    {
      icon: 'joystick-alt',
      label: '게임 취향',
      value: '다양한 게임',
    },
    {
      icon: 'time',
      label: '플레이 시간',
      value: '유연한 시간',
    },
    {
      icon: 'trophy',
      label: '플레이 스타일',
      value: '긍정적 플레이',
    },
  ];

  // 부족한 개수만큼 fallback 추가
  const neededCount = 3 - preferences.length;
  if (neededCount > 0) {
    preferences.push(...fallbackPreferences.slice(0, neededCount));
  }

  return {
    userId: apiResult.profile.userId,
    nickname: apiResult.profile.nickname,
    matchRate: apiResult.score,
    status: apiResult.status,
    animalType: apiResult.profile.animalType,
    preferences,
  };
};


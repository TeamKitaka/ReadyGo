/**
 * 📌 Domain Layer - Steam Stats to UI Text Converter
 *
 * - 순수 함수: 외부 상태(useState, hook, fetch, console 등)에 의존하지 않음
 * - 입력 → 출력이 명확한 변환 함수
 * - UI 레이어와 분리
 * - i18n / 번역 키 처리 미포함
 */

import type { SteamStatsDTO } from '@/commons/types/profile/profileCore.dto';

/**
 * 시간대 → 한글 시간 표시 매핑
 */
const TIME_SLOT_LABEL_MAP: Record<string, string> = {
  '00-06': '00 - 06시',
  '06-12': '06 - 12시',
  '12-18': '12 - 18시',
  '18-24': '18 - 24시',
};

/**
 * 영어 장르명 → 한글 장르명 매핑
 * party.tsx의 genreItems와 일치
 */
const GENRE_LABEL_MAP: Record<string, string> = {
  Action: '액션',
  Adventure: '모험',
  Casual: '캐주얼',
  'Early Access': '얼리 액세스',
  'Free To Play': '무료 플레이',
  Indie: '인디',
  'Massively Multiplayer': 'MMO',
  Nudity: '성인 요소',
  Racing: '레이싱',
  RPG: 'RPG',
  Simulation: '시뮬레이션',
  Sports: '스포츠',
  Strategy: '전략',
  Violent: '폭력성',
};

/**
 * 플레이 스타일 → 한글 표시 매핑
 */
const PLAY_STYLE_LABEL_MAP: Record<string, string> = {
  casual: '캐주얼',
  regular: '일반',
  hardcore: '하드코어',
};

/**
 * 영어 장르명을 한글로 변환
 *
 * @param genre - 영어 장르명 (예: "Action")
 * @returns string - 한글 장르명 (예: "액션"), 매핑이 없으면 원본 반환
 */
const translateGenreToKorean = (genre: string): string => {
  return GENRE_LABEL_MAP[genre] || genre;
};

/**
 * SteamStatsDTO의 mainGenres를 선호 장르 텍스트로 변환
 * - 첫 번째 장르의 글자 수가 5자 이하일 경우, 두 번째 장르와 " · "로 합쳐서 표시
 *
 * @param steamStats - SteamStatsDTO | undefined
 * @returns string | undefined - 한글로 변환된 장르 텍스트 (예: "액션" 또는 "액션 · 모험")
 */
export const toFavoriteGenreText = (
  steamStats: SteamStatsDTO | undefined
): string | undefined => {
  if (!steamStats || !steamStats.mainGenres || steamStats.mainGenres.length === 0) {
    return undefined;
  }

  // 첫 번째 장르를 한글로 변환
  const firstGenre = translateGenreToKorean(steamStats.mainGenres[0]);

  // 첫 번째 장르의 글자 수가 5자 이하이고, 두 번째 장르가 있는 경우
  if (firstGenre.length <= 5 && steamStats.mainGenres.length >= 2) {
    const secondGenre = translateGenreToKorean(steamStats.mainGenres[1]);
    return `${firstGenre} · ${secondGenre}`;
  }

  // 첫 번째 장르만 반환
  return firstGenre;
};

/**
 * 시간대 문자열을 인덱스로 변환
 * 00-06 → 0, 06-12 → 1, 12-18 → 2, 18-24 → 3
 */
const timeSlotToIndex = (timeSlot: string): number | null => {
  const indexMap: Record<string, number> = {
    '00-06': 0,
    '06-12': 1,
    '12-18': 2,
    '18-24': 3,
  };
  return indexMap[timeSlot] ?? null;
};

/**
 * 시간대 인덱스 배열을 패턴 분석하여 라벨로 변환
 * - {0,1,2,3} → 종일형
 * - {0,1} → 새벽·오전형
 * - {2,3} → 오후·야간형
 * - {1,2} → 주간형
 * - 비연속 (예: {0,2}, {1,3}) → 유동형
 */
const analyzeTimePattern = (indices: number[]): string => {
  if (indices.length === 0) {
    return '';
  }

  // 정렬된 인덱스 집합
  const sortedIndices = [...new Set(indices)].sort((a, b) => a - b);
  const indexSet = new Set(sortedIndices);

  // 종일형: 모든 시간대 포함
  if (indexSet.size === 4 && indexSet.has(0) && indexSet.has(1) && indexSet.has(2) && indexSet.has(3)) {
    return '종일형';
  }

  // 새벽·오전형: {0,1}
  if (indexSet.size === 2 && indexSet.has(0) && indexSet.has(1)) {
    return '새벽·오전형';
  }

  // 오후·야간형: {2,3}
  if (indexSet.size === 2 && indexSet.has(2) && indexSet.has(3)) {
    return '오후·야간형';
  }

  // 주간형: {1,2}
  if (indexSet.size === 2 && indexSet.has(1) && indexSet.has(2)) {
    return '주간형';
  }

  // 비연속 패턴 (유동형)
  // 연속된 인덱스가 아닌 경우
  let isConsecutive = true;
  for (let i = 0; i < sortedIndices.length - 1; i++) {
    if (sortedIndices[i + 1] - sortedIndices[i] !== 1) {
      isConsecutive = false;
      break;
    }
  }

  // 단일 시간대도 연속으로 간주 (예: {0}, {1}, {2}, {3})
  if (sortedIndices.length === 1) {
    isConsecutive = true;
  }

  // 연속되지 않으면 유동형
  if (!isConsecutive) {
    return '유동형';
  }

  // 그 외의 연속 패턴 (예: {0,1,2}, {1,2,3})도 유동형으로 처리
  // 또는 더 구체적인 라벨을 원한다면 여기서 추가 처리 가능
  return '유동형';
};

/**
 * SteamStatsDTO의 activeTimeSlots를 활동 시간 패턴 라벨로 변환
 *
 * @param steamStats - SteamStatsDTO | undefined
 * @returns string | undefined - "종일형", "새벽·오전형", "오후·야간형", "주간형", "유동형" 중 하나
 */
export const toSteamActiveTimeText = (
  steamStats: SteamStatsDTO | undefined
): string | undefined => {
  if (
    !steamStats ||
    !steamStats.activeTimeSlots ||
    steamStats.activeTimeSlots.length === 0
  ) {
    return undefined;
  }

  // 시간대 문자열을 인덱스로 변환
  const indices = steamStats.activeTimeSlots
    .map(timeSlotToIndex)
    .filter((idx): idx is number => idx !== null);

  if (indices.length === 0) {
    return undefined;
  }

  // 패턴 분석하여 라벨 반환
  return analyzeTimePattern(indices);
};

/**
 * SteamStatsDTO의 playStyle을 게임 성향 텍스트로 변환
 *
 * @param steamStats - SteamStatsDTO | undefined
 * @returns string | undefined - "캐주얼", "일반", "하드코어" 중 하나
 */
export const toGameStyleText = (
  steamStats: SteamStatsDTO | undefined
): string | undefined => {
  if (!steamStats || !steamStats.playStyle) {
    return undefined;
  }

  return PLAY_STYLE_LABEL_MAP[steamStats.playStyle] || steamStats.playStyle;
};

/**
 * SteamStatsDTO의 avgWeeklyPlaytime을 주간 평균 텍스트로 변환
 * - DB에는 분 단위로 저장되어 있으므로 60으로 나눠서 시간으로 변환
 *
 * @param steamStats - SteamStatsDTO | undefined
 * @returns string | undefined - "5.4 시간" 형식의 플레이타임 텍스트
 */
export const toWeeklyAverageText = (
  steamStats: SteamStatsDTO | undefined
): string | undefined => {
  if (!steamStats || steamStats.avgWeeklyPlaytime === undefined) {
    return undefined;
  }

  // 분을 시간으로 변환 (60으로 나누기)
  const hours = steamStats.avgWeeklyPlaytime / 60;
  
  // 소수점 첫째 자리까지 표시
  const hoursText = hours.toFixed(1);
  return `${hoursText} 시간`;
};

/**
 * 스팀 연동 상태에 따른 선호 장르 텍스트 반환
 *
 * @param steamId - 스팀 ID (연동 여부 확인)
 * @param steamStats - SteamStatsDTO | undefined (싱크 완료 여부 확인)
 * @returns string - "액션, RPG" 또는 "정보 필요" 또는 "연동 필요"
 */
export const getFavoriteGenreText = (
  steamId: string | null | undefined,
  steamStats: SteamStatsDTO | undefined
): string => {
  // 스팀 연동X (steamId가 null이거나 undefined인 경우)
  // 단, steamStats가 있으면 스팀 연동된 것으로 간주
  if ((steamId === null || steamId === undefined) && !steamStats) {
    return '연동 필요';
  }

  // 스팀 연동O, 싱크 완료
  if (steamStats) {
    const genreText = toFavoriteGenreText(steamStats);
    if (genreText) {
      return genreText;
    }
  }

  // 스팀 연동O, 싱크 실패 (비공개 계정 등)
  return '정보 필요';
};

/**
 * 스팀 연동 상태에 따른 주간 평균 텍스트 반환
 *
 * @param steamId - 스팀 ID (연동 여부 확인)
 * @param steamStats - SteamStatsDTO | undefined (싱크 완료 여부 확인)
 * @returns string - "5.4 시간" 또는 "정보 필요" 또는 "연동 필요"
 */
export const getWeeklyAverageText = (
  steamId: string | null | undefined,
  steamStats: SteamStatsDTO | undefined
): string => {
  // 스팀 연동X (steamId가 null이거나 undefined인 경우)
  // 단, steamStats가 있으면 스팀 연동된 것으로 간주
  if ((steamId === null || steamId === undefined) && !steamStats) {
    return '연동 필요';
  }

  // 스팀 연동O, 싱크 완료
  if (steamStats) {
    const averageText = toWeeklyAverageText(steamStats);
    if (averageText) {
      return averageText;
    }
  }

  // 스팀 연동O, 싱크 실패 (비공개 계정 등)
  return '정보 필요';
};


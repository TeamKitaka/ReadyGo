/**
 * 📌 Domain Layer - genrePlaytime2wMinutes to BarChartDataItem Converter
 *
 * 책임:
 * - genrePlaytime2wMinutes (Record<string, number>)를 BarChartDataItem[]로 변환
 * - 분 단위 → 시간 단위 변환 (60으로 나누기)
 * - 플레이타임 내림차순 정렬
 * - 전체 장르 표시 (제한 없음)
 * - 장르명 한글 변환
 *
 * 비책임:
 * - 데이터 fetch
 * - 에러 처리 (null/undefined는 빈 배열 반환)
 */

import type { BarChartDataItem } from '@/commons/components/bar-chart';

/**
 * 장르명 한글 변환 맵
 * - 일반적인 장르명은 한글로 변환
 * - 약어/고유명사는 그대로 유지
 * - Steam Store API에서 사용하는 장르명 기준
 */
const GENRE_NAME_MAP: Record<string, string> = {
  // 기본 장르
  Action: '액션',
  Adventure: '모험',
  Casual: '캐주얼',
  Indie: '인디',
  MassivelyMultiplayer: 'MMO',
  'Massively Multiplayer': 'MMO',
  Racing: '레이싱',
  RPG: 'RPG',
  Simulation: '시뮬레이션',
  Sports: '스포츠',
  Strategy: '전략',
  'Free to Play': '무료',
  FreeToPlay: '무료',
  'Early Access': '얼리액세스',
  EarlyAccess: '얼리액세스',
  
  // 게임플레이 장르
  Puzzle: '퍼즐',
  Platformer: '플랫포머',
  Horror: '공포',
  Survival: '생존',
  Shooter: '슈터',
  Fighting: '격투',
  Arcade: '아케이드',
  'Card & Board Game': '카드&보드',
  'Card and Board Game': '카드&보드',
  Card: '카드',
  Board: '보드',
  Educational: '교육',
  Music: '음악',
  Party: '파티',
  Sandbox: '샌드박스',
  'Open World': '오픈월드',
  OpenWorld: '오픈월드',
  'Turn-Based Strategy': '턴제 전략',
  TurnBased: '턴제',
  'Real-Time Strategy': '실시간 전략',
  RealTime: '실시간',
  'Tower Defense': '타워디펜스',
  TowerDefense: '타워디펜스',
  Roguelike: '로그라이크',
  Roguelite: '로그라이트',
  Metroidvania: '메트로배니아',
  'Visual Novel': '비주얼 노벨',
  VisualNovel: '비주얼 노벨',
  
  // 테마/설정 장르
  Anime: '애니메',
  'Sci-fi': 'SF',
  SciFi: 'SF',
  ScienceFiction: 'SF',
  Fantasy: '판타지',
  War: '전쟁',
  Space: '우주',
  'Post-apocalyptic': '포스트 아포칼립스',
  PostApocalyptic: '포스트 아포칼립스',
  Zombies: '좀비',
  Medieval: '중세',
  Steampunk: '스팀펑크',
  Cyberpunk: '사이버펑크',
  Western: '서부',
  Noir: '누아르',
  Historical: '역사',
  Military: '밀리터리',
  'World War II': '2차 세계대전',
  WorldWarII: '2차 세계대전',
  'World War I': '1차 세계대전',
  WorldWarI: '1차 세계대전',
  
  // 게임 모드/특성
  'Single Player': '싱글플레이어',
  SinglePlayer: '싱글플레이어',
  'Multiplayer': '멀티플레이어',
  'Co-op': '협동',
  CoOp: '협동',
  'Cooperative': '협동',
  'Competitive': '경쟁',
  'Online Co-Op': '온라인 협동',
  'Online PvP': '온라인 PvP',
  'Local Co-Op': '로컬 협동',
  'Local Multiplayer': '로컬 멀티플레이어',
  'Split Screen': '스플릿 스크린',
  SplitScreen: '스플릿 스크린',
  
  // 약어/고유명사는 그대로 유지
  FPS: 'FPS',
  MMO: 'MMO',
  MOBA: 'MOBA',
  RTS: 'RTS',
  TPS: 'TPS',
  ARPG: 'ARPG',
  JRPG: 'JRPG',
  CRPG: 'CRPG',
  MMORPG: 'MMORPG',
};

/**
 * 장르명을 한글로 변환
 * @param genreName - 원본 장르명 (영문)
 * @returns 한글 변환된 장르명 또는 원본 (변환 맵에 없을 경우)
 */
const translateGenreName = (genreName: string): string => {
  return GENRE_NAME_MAP[genreName] || genreName;
};

/**
 * genrePlaytime2wMinutes를 BarChartDataItem[]로 변환
 *
 * @param genrePlaytime2wMinutes - 장르별 플레이 시간 (분 단위)
 * @returns BarChartDataItem[] - 전체 장르 데이터 (시간 단위, 플레이타임 내림차순 정렬)
 *
 * @example
 * ```typescript
 * const genrePlaytime = {
 *   'Action': 1416,  // 23.6시간
 *   'Adventure': 1092,  // 18.2시간
 *   'RPG': 750,  // 12.5시간
 *   'Casual': 522,  // 8.7시간
 * };
 *
 * const barData = toBarChartData(genrePlaytime);
 * // [
 * //   { label: '액션', value: 23.6 },
 * //   { label: '모험', value: 18.2 },
 * //   { label: 'RPG', value: 12.5 },
 * //   { label: '캐주얼', value: 8.7 },
 * // ]
 * ```
 */
export const toBarChartData = (
  genrePlaytime2wMinutes: Record<string, number> | null | undefined
): BarChartDataItem[] => {
  // null/undefined 또는 빈 객체인 경우 빈 배열 반환
  if (!genrePlaytime2wMinutes || Object.keys(genrePlaytime2wMinutes).length === 0) {
    return [];
  }

  // 1. 장르별 플레이타임을 배열로 변환
  const entries = Object.entries(genrePlaytime2wMinutes);

  // 2. 플레이타임 내림차순 정렬
  const sortedEntries = entries.sort((a, b) => b[1] - a[1]);

  // 3. 전체 장르를 BarChartDataItem[]로 변환 (분 → 시간 변환, 한글 변환)
  return sortedEntries.map(([genreName, minutes]) => ({
    label: translateGenreName(genreName),
    value: Number((minutes / 60).toFixed(1)), // 분을 시간으로 변환, 소수점 첫째 자리까지
  }));
};


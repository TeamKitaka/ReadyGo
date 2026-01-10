import type { MatchReasonCoreDTO } from '@/commons/types/match/matchReasonCore.dto';
import type { MatchTagCoreDTO } from '@/commons/types/match/matchTagCore.dto';

/**
 * 배열 연산만 담당 (정렬, 선택)
 *
 * 📌 책임: 배열 → 배열
 * 📌 금지: 단일 객체 변환, ViewModel 생성
 */

// UI 정렬 우선순위 (설득력 기준)
const UI_REASON_SORT_ORDER: MatchReasonCoreDTO['detail']['type'][] = [
  'COMMON_GAME', // Steam 게임
  'STEAM_GENRE', // Steam 장르
  'STEAM_PLAYSTYLE', // Steam 플레이스타일
  'ONLINE_NOW', // 온라인
  'ACTIVITY_PATTERN', // 시간대
  'STYLE_SIMILARITY', // 성향
  'PLAY_TIME', // 플레이타임
  'RELIABILITY', // 신뢰도
  'PARTY_EXPERIENCE', // 파티 경험
];

const PRIORITY_ORDER: Record<MatchReasonCoreDTO['priority'], number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * Reason 배열을 UI 우선순위로 정렬
 */
export const sortReasonsByPriority = (
  reasons: MatchReasonCoreDTO[]
): MatchReasonCoreDTO[] => {
  return [...reasons].sort((a, b) => {
    // 1. UI_REASON_SORT_ORDER 기준
    const aIndex = UI_REASON_SORT_ORDER.indexOf(a.detail.type);
    const bIndex = UI_REASON_SORT_ORDER.indexOf(b.detail.type);

    if (aIndex !== -1 && bIndex !== -1 && aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    // 2. Domain Priority 기준 (같은 카테고리 내)
    const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    // 3. baseline이 아닌 것 우선
    if (a.isBaseline !== b.isBaseline) {
      return a.isBaseline ? 1 : -1;
    }

    return 0;
  });
};

/**
 * 상위 N개 reason 선택
 */
export const pickTopReasons = (
  reasons: MatchReasonCoreDTO[],
  count: number
): MatchReasonCoreDTO[] => {
  return reasons.slice(0, count);
};

/**
 * 상위 N개 tag 선택
 */
export const pickTopTags = (
  tags: MatchTagCoreDTO[],
  count: number
): MatchTagCoreDTO[] => {
  return tags.slice(0, count);
};


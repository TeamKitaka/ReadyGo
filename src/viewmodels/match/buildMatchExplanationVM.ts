import type { MatchReasonCoreDTO } from '@/commons/types/match/matchReasonCore.dto';
import type { MatchTagCoreDTO } from '@/commons/types/match/matchTagCore.dto';
import type { MatchReasonViewModel } from './MatchResultViewModel';
import {
  sortReasonsByPriority,
  pickTopReasons,
  pickTopTags,
} from './utils/sortAndFilterHelpers';
import { toMatchResultViewModel } from './toMatchResultViewModel';

/**
 * MatchCardExplanationVM 생성 함수
 *
 * 📌 책임: CoreDTO → ViewModel 변환의 중앙 허브
 * 📌 정렬, fallback 채우기, tag 강조도 계산, summary 생성 포함
 */

interface BuildMatchExplanationVMOptions {
  /**
   * 카드 타입
   * - 'list': 매칭 목록 카드 (3개 reason, 3개 tag)
   * - 'detail': 상세 프로필 (5개 reason, 5개 tag, summary 포함)
   */
  variant: 'list' | 'detail';

  /**
   * Steam 연동 여부 (tag 강조도 계산에 사용)
   */
  isSteamConnected: boolean;
}

/**
 * Explanation ViewModel
 */
export interface MatchCardExplanationVM {
  headlineReasons: Array<MatchReasonViewModel & { isFallback?: boolean }>;
  tags: Array<{ label: string; emphasis: 'primary' | 'secondary' }>;
  shortSummary?: string;
}

/**
 * Fallback reasons (Domain에서 온 것이 아닌 UI 전용)
 */
const FALLBACK_REASONS: MatchReasonViewModel[] = [
  {
    type: 'FALLBACK',
    icon: '✨',
    label: '새로운조합',
    primaryText: '새로운 조합이라 더 재밌을 수 있어요',
    isHighlight: false,
    isFallback: true,
  },
  {
    type: 'FALLBACK',
    icon: '🎲',
    label: '취향발견',
    primaryText: '함께 플레이하며 취향을 더 맞춰갈 수 있어요',
    isHighlight: false,
    isFallback: true,
  },
  {
    type: 'FALLBACK',
    icon: '📈',
    label: '성장가능',
    primaryText: '프로필이 채워질수록 더 정교해져요',
    isHighlight: false,
    isFallback: true,
  },
];

/**
 * Tag label을 reason type으로 매핑 (강조도 계산용)
 */
const mapLabelToReasonType = (
  label: string
): MatchReasonCoreDTO['detail']['type'] | undefined => {
  const mapping: Record<
    string,
    MatchReasonCoreDTO['detail']['type'] | undefined
  > = {
    같은게임: 'COMMON_GAME',
    플타임일치: 'PLAY_TIME',
    시간잘맞음: 'ACTIVITY_PATTERN',
    지금온라인: 'ONLINE_NOW',
    매너좋음: 'RELIABILITY',
    같은취향: 'STEAM_GENRE',
    플스타일유사: 'STEAM_PLAYSTYLE',
    // Trait 기반 태그들 (Target의 특성)
    협동형: 'STYLE_SIMILARITY',
    탐험형: 'STYLE_SIMILARITY',
    전략형: 'STYLE_SIMILARITY',
    리더형: 'STYLE_SIMILARITY',
    사교형: 'STYLE_SIMILARITY',
    보완궁합: 'STYLE_SIMILARITY', // 상호보완적
    // 동물 궁합
    천생연분: undefined,
    궁합좋음: undefined,
    // 경험/신뢰
    파티러버: undefined,
    베테랑: undefined,
    꾸준함: undefined,
    경험유사: undefined,
    // 활동 패턴
    활동적: undefined,
    집중형: undefined,
    // 시간대
    아침형: undefined,
    저녁형: undefined,
    오후형: undefined,
    올빼미형: undefined,
    유연형: undefined,
    주말형: undefined,
    // Fallback
    좋은만남: undefined,
  };
  return mapping[label];
};

/**
 * CoreDTO를 ViewModel로 변환
 */
export const buildMatchExplanationVM = (
  reasons: MatchReasonCoreDTO[],
  tags: MatchTagCoreDTO[],
  options: BuildMatchExplanationVMOptions
): MatchCardExplanationVM => {
  const { variant, isSteamConnected } = options;

  // 1. Reason 처리
  const reasonCount = variant === 'detail' ? 5 : 3;
  const sortedReasons = sortReasonsByPriority(reasons);
  const selectedReasons = pickTopReasons(sortedReasons, reasonCount);

  // toMatchResultViewModel을 사용하여 변환
  const mockCoreDTO = {
    userId: '',
    targetUserId: '',
    similarityScore: 0,
    reasons: selectedReasons,
    tags: [],
  };

  const viewModelResult = toMatchResultViewModel(mockCoreDTO);
  const headlineReasons = viewModelResult.reasons.map((reason) => ({
    ...reason,
    isFallback: reason.isFallback,
  }));

  // Fallback 채우기 (Domain이 부족한 경우)
  let fallbackIndex = 0;
  while (headlineReasons.length < reasonCount) {
    const fallback = FALLBACK_REASONS[fallbackIndex % FALLBACK_REASONS.length];
    headlineReasons.push(fallback);
    fallbackIndex++;
  }

  // 2. Tag 처리
  const tagCount = variant === 'detail' ? 5 : 3;
  const selectedTags = pickTopTags(tags, tagCount);

  const tagsVM = selectedTags.map((tag) => {
    const tagType = mapLabelToReasonType(tag.label);
    const isSteamRelated = tagType
      ? ['COMMON_GAME', 'STEAM_GENRE', 'STEAM_PLAYSTYLE'].includes(tagType)
      : false;
    const isHighPriority = tagType
      ? ['STYLE_SIMILARITY', 'ACTIVITY_PATTERN', 'ONLINE_NOW'].includes(tagType)
      : false;

    // 동물 궁합 태그 (천생연분, 궁합좋음)
    const isAnimalCompatibility = ['천생연분', '궁합좋음'].includes(tag.label);

    // 시간대 태그 (아침형, 저녁형, 오후형, 올빼미형, 유연형, 주말형)
    const isTimeSlotTag = [
      '아침형',
      '저녁형',
      '오후형',
      '올빼미형',
      '유연형',
      '주말형',
    ].includes(tag.label);

    // Trait 태그 (Target의 성향 특성)
    const isTraitTag = [
      '협동형',
      '탐험형',
      '전략형',
      '리더형',
      '사교형',
      '보완궁합',
    ].includes(tag.label);

    // MVP 핵심 태그 (꾸준함 등 행동 기반)
    const isMVPTag = ['꾸준함', '파티러버', '베테랑'].includes(tag.label);

    let emphasis: 'primary' | 'secondary' = 'secondary';

    // 1순위: 동물 궁합 태그 (항상 강조)
    if (isAnimalCompatibility) {
      emphasis = 'primary';
    }
    // 2순위: Trait 태그 강조 (Target의 명확한 특성)
    else if (isTraitTag) {
      emphasis = 'primary';
    }
    // 3순위: MVP 핵심 태그 강조 (행동 기반)
    else if (isMVPTag) {
      emphasis = 'primary';
    }
    // 4순위: Steam 연동 시 Steam 관련 태그 강조
    else if (isSteamConnected && isSteamRelated) {
      emphasis = 'primary';
    }
    // 5순위: 고우선순위 태그 + 시간대 태그 강조
    else if (isHighPriority || isTimeSlotTag) {
      emphasis = 'primary';
    }

    return {
      label: tag.label,
      emphasis,
    };
  });

  // 3. Short Summary (detail variant만)
  let shortSummary: string | undefined;
  if (variant === 'detail') {
    const hasSteamGame = reasons.some(
      (r) => r.detail.type === 'COMMON_GAME' || r.detail.type === 'STEAM_GENRE'
    );
    const hasStyleSimilarity = reasons.some(
      (r) => r.detail.type === 'STYLE_SIMILARITY'
    );
    const hasActivityMatch = reasons.some(
      (r) =>
        r.detail.type === 'ACTIVITY_PATTERN' || r.detail.type === 'ONLINE_NOW'
    );

    // 조합에 따른 요약 생성
    if (hasSteamGame && hasStyleSimilarity) {
      shortSummary = '게임 취향과 플레이 성향이 잘 맞아요';
    } else if (hasSteamGame && hasActivityMatch) {
      shortSummary = '같은 게임을 비슷한 시간대에 즐겨요';
    } else if (hasStyleSimilarity && hasActivityMatch) {
      shortSummary = '성향도 비슷하고 활동 시간대도 잘 맞아요';
    } else if (hasSteamGame) {
      shortSummary = '함께 즐길 게임이 많아요';
    } else if (hasStyleSimilarity) {
      shortSummary = '플레이 성향이 잘 맞아서 즐거운 게임이 될 거예요';
    } else if (hasActivityMatch) {
      shortSummary = '비슷한 시간대에 함께 플레이할 수 있어요';
    } else {
      shortSummary = '새로운 조합이라 더 재밌을 수 있어요'; // Fallback
    }
  }

  return {
    headlineReasons,
    tags: tagsVM,
    shortSummary,
  };
};

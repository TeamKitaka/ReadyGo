import type { MatchReasonCoreDTO } from '@/commons/types/match/matchReasonCore.dto';
import type { MatchTagCoreDTO } from '@/commons/types/match/matchTagCore.dto';
import type { MatchCardExplanationVM } from '../types/matchExplanation.types';
import {
  sortReasonsByPriority,
  pickTopReasons,
  pickTopTags,
} from './explanationHelpers';
import { formatReason, FALLBACK_REASONS } from './reasonFormatter';

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
 * Tag label을 reason type으로 매핑 (강조도 계산용)
 */
function mapLabelToReasonType(
  label: string
): MatchReasonCoreDTO['detail']['type'] | undefined {
  const mapping: Record<string, MatchReasonCoreDTO['detail']['type']> = {
    같은게임: 'COMMON_GAME',
    플타임일치: 'PLAY_TIME',
    스타일유사: 'STYLE_SIMILARITY',
    시간대일치: 'ACTIVITY_PATTERN',
    지금온라인: 'ONLINE_NOW',
    매너좋음: 'RELIABILITY', // 신뢰높음 → 매너좋음으로 변경
    장르일치: 'STEAM_GENRE',
    플스타일유사: 'STEAM_PLAYSTYLE',
    // 새로운 태그들은 reason type이 없으므로 undefined 반환
    천생연분: undefined,
    궁합좋음: undefined,
    파티러버: undefined,
    베테랑: undefined,
    활동적: undefined,
    좋은만남: undefined,
    경험유사: undefined,
  };
  return mapping[label];
}

/**
 * CoreDTO를 ViewModel로 변환
 */
export function buildMatchExplanationVM(
  reasons: MatchReasonCoreDTO[],
  tags: MatchTagCoreDTO[],
  options: BuildMatchExplanationVMOptions
): MatchCardExplanationVM {
  const { variant, isSteamConnected } = options;

  // 1. Reason 처리
  const reasonCount = variant === 'detail' ? 5 : 3;
  const sortedReasons = sortReasonsByPriority(reasons);
  const selectedReasons = pickTopReasons(sortedReasons, reasonCount);

  // 변환
  const headlineReasons = selectedReasons.map((reason) => {
    const formatted = formatReason(reason);
    return {
      ...formatted,
      isFallback: reason.isBaseline, // Domain의 isBaseline을 UI에 전달
    };
  });

  // Fallback 채우기 (Domain이 부족한 경우)
  let fallbackIndex = 0;
  while (headlineReasons.length < reasonCount) {
    const fallback = FALLBACK_REASONS[fallbackIndex % FALLBACK_REASONS.length];
    headlineReasons.push({
      ...fallback,
      isFallback: true,
    });
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

    let emphasis: 'primary' | 'secondary' = 'secondary';

    // 1순위: 동물 궁합 태그 (항상 강조)
    if (isAnimalCompatibility) {
      emphasis = 'primary';
    }
    // 2순위: Steam 연동 시 Steam 관련 태그 강조
    else if (isSteamConnected && isSteamRelated) {
      emphasis = 'primary';
    }
    // 3순위: 고우선순위 태그 강조
    else if (isHighPriority) {
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
}


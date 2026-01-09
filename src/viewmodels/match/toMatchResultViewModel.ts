/**
 * 📌 ViewModel Layer - MatchResultCoreDTO to MatchResultViewModel Converter
 *
 * - 순수 함수: 외부 의존성(API, hook, store, router) 참조 금지
 * - Core DTO를 UI 친화적 ViewModel로 변환
 * - side effect 없음 (try/catch, throw, console 등 금지)
 *
 * 📌 책임 범위:
 * - Core DTO → ViewModel 단방향 변환만 수행
 * - 문구 조합, UI 표현 단위 변환 수행
 * - 상태 판단 로직 포함 금지
 * - API 호출, 데이터 fetch 포함 금지
 */

import type { MatchResultCoreDTO } from '@/commons/types/match/matchResultCore.dto';
import type { PartyMatchSummaryCoreDTO } from '@/commons/types/match/partyMatchSummaryCore.dto';
import type { MatchReasonCoreDTO } from '@/commons/types/match/matchReasonCore.dto';
import type { MatchTagCoreDTO } from '@/commons/types/match/matchTagCore.dto';
import type {
  MatchResultViewModel,
  PartyMatchSummaryViewModel,
  MatchReasonViewModel,
  MatchTagViewModel,
  MatchScoreViewModel,
  PartySuccessViewModel,
} from './MatchResultViewModel';

/**
 * MatchReasonCoreDTO를 MatchReasonViewModel로 변환
 *
 * @param reasonDTO - MatchReasonCoreDTO
 * @returns MatchReasonViewModel - UI 친화적 Reason
 */
const toReasonViewModel = (
  reasonDTO: MatchReasonCoreDTO
): MatchReasonViewModel => {
  const { detail, isBaseline } = reasonDTO;

  // Baseline reason (Domain이 의미 없다고 판단한 것)
  if (isBaseline) {
    return {
      type: 'BASELINE',
      icon: '✨',
      label: '새로운만남',
      primaryText: '새로운 만남의 시작이에요',
      isHighlight: false,
      isFallback: true,
    };
  }

  // 의미 있는 reason들
  switch (detail.type) {
    case 'COMMON_GAME': {
      const gameNames = detail.topGames?.slice(0, 2).join(', ') || '';
      return {
        type: detail.type,
        icon: '🎮',
        label: '동일게임',
        primaryText: `${detail.gameCount}개의 같은 게임을 플레이해요`,
        secondaryText: gameNames || `${detail.gameCount}개`,
        isHighlight: detail.gameCount >= 3,
      };
    }

    case 'STYLE_SIMILARITY': {
      // topTrait에 따라 구체적인 메시지 제공
      const topTrait = detail.topTrait;
      
      switch (topTrait) {
        case 'cooperation':
          return {
            type: detail.type,
            icon: '🤝',
            label: '협동적',
            primaryText: '팀 플레이를 중요하게 여겨요',
            secondaryText: '협동 성향이 높아요',
            isHighlight: true,
          };
        
        case 'exploration':
          return {
            type: detail.type,
            icon: '🧭',
            label: '탐험가',
            primaryText: '새로운 콘텐츠를 좋아해요',
            secondaryText: '탐험 성향이 높아요',
            isHighlight: true,
          };
        
        case 'strategy':
          return {
            type: detail.type,
            icon: '🎯',
            label: '효율러',
            primaryText: '최적화된 플레이를 선호해요',
            secondaryText: '전략 성향이 높아요',
            isHighlight: true,
          };
        
        case 'leadership':
          return {
            type: detail.type,
            icon: '👑',
            label: '리더형',
            primaryText: '팀을 이끄는 역할을 자주 맡아요',
            secondaryText: '리더십이 뛰어나요',
            isHighlight: true,
          };
        
        case 'social':
          return {
            type: detail.type,
            icon: '💬',
            label: '소통왕',
            primaryText: '소통이 활발해요',
            secondaryText: '사교성이 높아요',
            isHighlight: true,
          };
        
        default: {
          // fallback (안전장치)
          const traitLabel = getTraitLabel(topTrait);
          return {
            type: detail.type,
            icon: '🤝',
            label: '스타일유사',
            primaryText: `${traitLabel} 성향이 비슷해요`,
            isHighlight: detail.similarityScore >= 70,
          };
        }
      }
    }

    case 'ACTIVITY_PATTERN': {
      // viewerTimeType과 targetTimeType이 있으면 관계 기반 메시지 생성
      const viewerType = detail.viewerTimeType;
      const targetType = detail.targetTimeType;
      
      if (viewerType && targetType) {
        // 1. 같은 타입 (가장 강력)
        if (viewerType === targetType) {
          switch (viewerType) {
            case 'morning':
              return {
                type: detail.type,
                icon: '🌅',
                label: '아침형',
                primaryText: '주로 오전에 활동해요',
                secondaryText: '생활 리듬이 비슷해요',
                isHighlight: true,
              };
            case 'afternoon':
              return {
                type: detail.type,
                icon: '☀️',
                label: '오후형',
                primaryText: '오후 시간대에 자주 접속해요',
                secondaryText: '생활 패턴이 유사해요',
                isHighlight: true,
              };
            case 'evening':
              return {
                type: detail.type,
                icon: '🌆',
                label: '저녁형',
                primaryText: '퇴근 후 플레이 시간이 잘 맞아요',
                secondaryText: '저녁 시간대 일치',
                isHighlight: true,
              };
            case 'lateNight':
              return {
                type: detail.type,
                icon: '🦉',
                label: '올빼미',
                primaryText: '밤에 활발하게 플레이해요',
                secondaryText: '심야 시간대 일치',
                isHighlight: true,
              };
            case 'weekend':
              return {
                type: detail.type,
                icon: '🎮',
                label: '주말형',
                primaryText: '주말에 함께 게임하기 좋아요',
                secondaryText: '주말 집중 플레이',
                isHighlight: true,
              };
            case 'flexible':
              return {
                type: detail.type,
                icon: '🕐',
                label: '유연함',
                primaryText: '시간 조율이 쉬워요',
                secondaryText: '유연한 시간대',
                isHighlight: true,
              };
          }
        }
        
        // 2. 보완형 (설득력 있음)
        const isEveningLateNight =
          (viewerType === 'evening' && targetType === 'lateNight') ||
          (viewerType === 'lateNight' && targetType === 'evening');
        
        if (isEveningLateNight) {
          return {
            type: detail.type,
            icon: '🌙',
            label: '시간대보완',
            primaryText: '저녁부터 밤까지 자연스럽게 이어져요',
            secondaryText: '보완적 시간대',
            isHighlight: true,
          };
        }
        
        const hasFlexible = viewerType === 'flexible' || targetType === 'flexible';
        if (hasFlexible) {
          return {
            type: detail.type,
            icon: '🔄',
            label: '유연함',
            primaryText: '시간대에 맞춰 함께 플레이하기 좋아요',
            secondaryText: '유연한 조율',
            isHighlight: true,
          };
        }
        
        // 3. 다른 타입이지만 긍정적으로 표현 (절대 감점 금지)
        return {
          type: detail.type,
          icon: '⏰',
          label: '여유형',
          primaryText: '각자의 시간대에서 자유롭게 즐기는 스타일이에요',
          isHighlight: false,
        };
      }
      
      // Fallback: viewerTimeType이 없는 경우
      return {
        type: detail.type,
        icon: '⏰',
        label: '시간대일치',
        primaryText: '비슷한 시간대에 활동해요',
        isHighlight: detail.patternScore >= 70,
      };
    }

    case 'ONLINE_NOW':
      return {
        type: detail.type,
        icon: '🟢',
        label: '지금온라인',
        primaryText: '지금 온라인 상태예요',
        isHighlight: true,
      };

    case 'PLAY_TIME':
      return {
        type: detail.type,
        icon: '⏱️',
        label: '플타임유사',
        primaryText: `플레이 시간이 ${detail.matchScore}% 비슷해요`,
        isHighlight: detail.matchScore >= 70,
      };

    case 'RELIABILITY':
      return {
        type: detail.type,
        icon: '🛡️',
        label: '매너좋음',
        primaryText: `신뢰도 점수 ${detail.reliabilityScore}점`,
        isHighlight: detail.reliabilityScore >= 70,
      };

    case 'STEAM_GENRE': {
      const genre = detail.genre || '공통';
      return {
        type: detail.type,
        icon: '🎵',
        label: '장르일치',
        primaryText: `${genre} 장르를 함께 즐겨요`,
        isHighlight: true,
      };
    }

    case 'STEAM_PLAYSTYLE':
      return {
        type: detail.type,
        icon: '🕹️',
        label: '플스타일유사',
        primaryText: '플레이 스타일이 잘 맞아요',
        isHighlight: true,
      };

    case 'PARTY_EXPERIENCE':
      return {
        type: detail.type,
        icon: '👥',
        label: '파티러버',
        primaryText: '파티 플레이 경험이 풍부해요',
        isHighlight: detail.experienceScore >= 70,
      };

    default:
      return {
        type: 'UNKNOWN',
        icon: '💡',
        label: '기타',
        primaryText: '함께하면 즐거울 거예요',
        isHighlight: false,
      };
  }
};

/**
 * Trait 이름을 한글 라벨로 변환
 *
 * @param traitName - Trait 이름 (예: 'cooperation', 'exploration')
 * @returns 한글 라벨 (예: '협동', '탐험')
 */
const getTraitLabel = (traitName: string): string => {
  const traitLabels: Record<string, string> = {
    cooperation: '협동',
    exploration: '탐험',
    strategy: '전략',
    leadership: '리더십',
    social: '사교',
  };

  return traitLabels[traitName] || traitName;
};

/**
 * MatchTagCoreDTO를 MatchTagViewModel로 변환
 *
 * @param tagDTO - MatchTagCoreDTO
 * @returns MatchTagViewModel - UI 스타일이 추가된 Tag
 */
const toTagViewModel = (tagDTO: MatchTagCoreDTO): MatchTagViewModel => {
  const { label } = tagDTO;

  // 라벨에 따른 색상 타입 매핑
  const colorTypeMap: Record<string, MatchTagViewModel['colorType']> = {
    같은게임: 'primary',
    플타임일치: 'success',
    스타일유사: 'info',
    시간대일치: 'info',
    신뢰높음: 'success',
    지금온라인: 'warning',
    활동패턴: 'info',
    경험유사: 'default',
  };

  return {
    label,
    colorType: colorTypeMap[label] || 'default',
  };
};

/**
 * similarityScore를 MatchScoreViewModel로 변환
 *
 * @param score - 유사도 점수 (0~100)
 * @returns MatchScoreViewModel - UI 표현 단위
 */
const toScoreViewModel = (score: number): MatchScoreViewModel => {
  const percentText = `${score}%`;
  const gaugeValue = score / 100;

  let gradeLabel: string;
  let gradeColor: MatchScoreViewModel['gradeColor'];

  if (score >= 61) {
    gradeLabel = '높은 매칭';
    gradeColor = 'high';
  } else if (score >= 31) {
    gradeLabel = '보통 매칭';
    gradeColor = 'medium';
  } else {
    gradeLabel = '낮은 매칭';
    gradeColor = 'low';
  }

  return {
    score,
    percentText,
    gaugeValue,
    gradeLabel,
    gradeColor,
  };
};

/**
 * successProbability를 PartySuccessViewModel로 변환
 *
 * @param probability - 파티 성공 확률 (0~100)
 * @returns PartySuccessViewModel - UI 표현 단위
 */
const toSuccessViewModel = (probability: number): PartySuccessViewModel => {
  const percentText = `${probability}%`;

  let successLabel: string;
  let successColor: PartySuccessViewModel['successColor'];

  if (probability >= 71) {
    successLabel = '높은 성공률';
    successColor = 'high';
  } else if (probability >= 41) {
    successLabel = '보통 성공률';
    successColor = 'medium';
  } else {
    successLabel = '낮은 성공률';
    successColor = 'low';
  }

  return {
    probability,
    percentText,
    successLabel,
    successColor,
  };
};

/**
 * computedAt을 상대 시간 문구로 변환
 *
 * @param computedAt - ISO 8601 형식의 계산 시점
 * @returns 상대 시간 문구 (예: '5분 전', '1시간 전', '오늘')
 */
const toComputedTimeText = (computedAt?: string): string | undefined => {
  if (!computedAt) {
    return undefined;
  }

  const now = new Date();
  const computed = new Date(computedAt);
  const diffMs = now.getTime() - computed.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);

  if (diffMinutes < 1) {
    return '방금 전';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 0) {
    return '오늘';
  }
  if (diffDays === 1) {
    return '어제';
  }

  return `${diffDays}일 전`;
};

/**
 * MatchResultCoreDTO를 MatchResultViewModel로 변환
 *
 * @param coreDTO - MatchResultCoreDTO
 * @returns MatchResultViewModel - UI 렌더링에 최적화된 ViewModel
 *
 * @example
 * ```typescript
 * const coreDTO: MatchResultCoreDTO = {
 *   userId: 'viewer-uuid',
 *   targetUserId: 'target-uuid',
 *   similarityScore: 87,
 *   isOnlineMatched: true,
 *   reasons: [
 *     { detail: { type: 'COMMON_GAME', gameCount: 5, topGames: ['Dota 2', 'CS2'] } },
 *     { detail: { type: 'PLAY_TIME', matchScore: 85 } },
 *     { detail: { type: 'STYLE_SIMILARITY', similarityScore: 82, topTrait: 'cooperation' } }
 *   ],
 *   tags: [
 *     { label: '같은게임' },
 *     { label: '플타임일치' },
 *     { label: '스타일유사' }
 *   ],
 *   computedAt: '2026-01-05T10:30:00Z'
 * };
 *
 * const viewModel = toMatchResultViewModel(coreDTO);
 * // {
 * //   userId: 'viewer-uuid',
 * //   targetUserId: 'target-uuid',
 * //   score: {
 * //     score: 87,
 * //     percentText: '87%',
 * //     gaugeValue: 0.87,
 * //     gradeLabel: '높은 매칭',
 * //     gradeColor: 'high'
 * //   },
 * //   reasons: [
 * //     { type: 'COMMON_GAME', primaryText: '공통 게임 5개 보유', secondaryText: 'Dota 2, CS2', isHighlight: true },
 * //     { type: 'PLAY_TIME', primaryText: '플레이 시간 85% 일치', isHighlight: true },
 * //     { type: 'STYLE_SIMILARITY', primaryText: '플레이 스타일 82% 유사', secondaryText: '협동 성향 일치', isHighlight: true }
 * //   ],
 * //   tags: [
 * //     { label: '같은게임', colorType: 'primary' },
 * //     { label: '플타임일치', colorType: 'success' },
 * //     { label: '스타일유사', colorType: 'info' }
 * //   ],
 * //   onlineBadge: '지금 온라인',
 * //   computedTimeText: '5분 전'
 * // }
 * ```
 */
export const toMatchResultViewModel = (
  coreDTO: MatchResultCoreDTO
): MatchResultViewModel => {
  // Core DTO의 각 필드를 ViewModel로 변환
  const score = toScoreViewModel(coreDTO.similarityScore);
  const reasons = coreDTO.reasons.map(toReasonViewModel);
  const tags = coreDTO.tags.map(toTagViewModel);
  const onlineBadge = coreDTO.isOnlineMatched ? '지금 온라인' : undefined;
  const computedTimeText = toComputedTimeText(coreDTO.computedAt);

  return {
    userId: coreDTO.userId,
    targetUserId: coreDTO.targetUserId,
    score,
    reasons,
    tags,
    onlineBadge,
    computedTimeText,
  };
};

/**
 * PartyMatchSummaryCoreDTO를 PartyMatchSummaryViewModel로 변환
 *
 * @param coreDTO - PartyMatchSummaryCoreDTO
 * @returns PartyMatchSummaryViewModel - UI 렌더링에 최적화된 ViewModel
 *
 * @example
 * ```typescript
 * const coreDTO: PartyMatchSummaryCoreDTO = {
 *   userId: 'viewer-uuid',
 *   targetUserId: 'target-uuid',
 *   successProbability: 85,
 *   reasons: [
 *     { detail: { type: 'COMMON_GAME', gameCount: 5, topGames: ['Dota 2', 'CS2'] } },
 *     { detail: { type: 'STYLE_SIMILARITY', similarityScore: 82, topTrait: 'cooperation' } },
 *     { detail: { type: 'ONLINE_NOW', isOnline: true } }
 *   ],
 *   computedAt: '2026-01-05T10:30:00Z'
 * };
 *
 * const viewModel = toPartyMatchSummaryViewModel(coreDTO);
 * // {
 * //   userId: 'viewer-uuid',
 * //   targetUserId: 'target-uuid',
 * //   success: {
 * //     probability: 85,
 * //     percentText: '85%',
 * //     successLabel: '높은 성공률',
 * //     successColor: 'high'
 * //   },
 * //   reasons: [
 * //     { type: 'COMMON_GAME', primaryText: '공통 게임 5개 보유', secondaryText: 'Dota 2, CS2', isHighlight: true },
 * //     { type: 'STYLE_SIMILARITY', primaryText: '플레이 스타일 82% 유사', secondaryText: '협동 성향 일치', isHighlight: true },
 * //     { type: 'ONLINE_NOW', primaryText: '지금 온라인', isHighlight: true }
 * //   ],
 * //   computedTimeText: '5분 전'
 * // }
 * ```
 */
export const toPartyMatchSummaryViewModel = (
  coreDTO: PartyMatchSummaryCoreDTO
): PartyMatchSummaryViewModel => {
  const success = toSuccessViewModel(coreDTO.successProbability);
  const reasons = coreDTO.reasons.map(toReasonViewModel);
  const computedTimeText = toComputedTimeText(coreDTO.computedAt);

  return {
    userId: coreDTO.userId,
    targetUserId: coreDTO.targetUserId,
    success,
    reasons,
    computedTimeText,
  };
};

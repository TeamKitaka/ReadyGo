import type { ReactNode } from 'react';
import type { MatchReasonCoreDTO } from '@/commons/types/match/matchReasonCore.dto';

/**
 * 단일 reason을 UI 표시용 객체로 변환
 *
 * 📌 책임: 1개의 reason → { icon, text }
 * 📌 금지: 배열 연산, 정렬, 선택 로직
 */

interface FormattedReason {
  icon: ReactNode;
  text: string;
}

// Trait 한글 매핑
const traitLabels: Record<string, string> = {
  cooperation: '협동',
  exploration: '탐험',
  strategy: '전략',
  leadership: '리더십',
  social: '사교성',
};

/**
 * MatchReasonCoreDTO를 UI 표시용 객체로 변환
 */
export function formatReason(reason: MatchReasonCoreDTO): FormattedReason {
  // Baseline reason (Domain이 의미 없다고 판단한 것)
  if (reason.isBaseline) {
    return {
      icon: '✨',
      text: '새로운 만남의 시작이에요',
    };
  }

  // 의미 있는 reason들
  switch (reason.detail.type) {
    case 'COMMON_GAME':
      return {
        icon: '🎮',
        text: `${reason.detail.gameCount}개의 같은 게임을 플레이해요`,
      };

    case 'STYLE_SIMILARITY':
      const traitLabel =
        traitLabels[reason.detail.topTrait] || reason.detail.topTrait;
      return {
        icon: '🤝',
        text: `${traitLabel} 성향이 비슷해요`,
      };

    case 'ACTIVITY_PATTERN':
      // commonTimeSlots 객체 배열을 읽기 쉽게 변환
      const slots = reason.detail.commonTimeSlots || [];
      if (slots.length === 0) {
        return { icon: '⏰', text: '비슷한 시간대에 활동해요' };
      }
      // slots는 { dayType: string, timeSlot: string }[] 형태
      // 예: [{ dayType: 'weekday', timeSlot: '22:00-00:00' }]
      const timeSlotStr = slots[0].timeSlot;
      const [startTime, endTime] = timeSlotStr.split('-');
      const startHour = startTime.split(':')[0];
      const endHour = endTime.split(':')[0];
      return {
        icon: '⏰',
        text: `${startHour}시~${endHour}시에 함께 플레이할 수 있어요`,
      };

    case 'ONLINE_NOW':
      return {
        icon: '🟢',
        text: '지금 온라인 상태예요',
      };

    case 'PLAY_TIME':
      return {
        icon: '⏱️',
        text: `플레이 시간이 ${reason.detail.matchScore}% 비슷해요`,
      };

    case 'RELIABILITY':
      return {
        icon: '🛡️',
        text: `신뢰도 점수 ${reason.detail.reliabilityScore}점`,
      };

    case 'STEAM_GENRE':
      return {
        icon: '🎵',
        text: `${reason.detail.genre} 장르를 함께 즐겨요`,
      };

    case 'STEAM_PLAYSTYLE':
      return {
        icon: '🕹️',
        text: '플레이 스타일이 잘 맞아요',
      };

    case 'PARTY_EXPERIENCE':
      return {
        icon: '👥',
        text: '파티 플레이 경험이 풍부해요',
      };

    default:
      return {
        icon: '💡',
        text: '함께하면 즐거울 거예요',
      };
  }
}

/**
 * Fallback reasons (Domain에서 온 것이 아닌 UI 전용)
 */
export const FALLBACK_REASONS: FormattedReason[] = [
  { icon: '✨', text: '새로운 조합이라 더 재밌을 수 있어요' },
  { icon: '🎲', text: '함께 플레이하며 취향을 더 맞춰갈 수 있어요' },
  { icon: '📈', text: '프로필이 채워질수록 더 정교해져요' },
];


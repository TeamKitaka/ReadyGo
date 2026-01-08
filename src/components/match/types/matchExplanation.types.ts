import type { ReactNode } from 'react';

/**
 * UI ViewModel: 카드에서 바로 렌더 가능한 형태
 *
 * ⚠️ 주의: Domain DTO가 아님!
 * - Domain은 "사실 데이터"만 제공
 * - ViewModel은 "표현 방식"까지 포함
 */
export interface MatchCardExplanationVM {
  /**
   * 헤드라인 이유 목록 (카드에 표시할 이유)
   *
   * 이미 정렬/fallback/변환이 완료된 상태
   */
  headlineReasons: Array<{
    icon: ReactNode; // 아이콘 컴포넌트
    text: string; // 렌더 가능한 완성된 문장
    isFallback?: boolean; // fallback 여부 (스타일 차별화용)
  }>;

  /**
   * 태그 목록 (카드에 표시할 태그)
   */
  tags: Array<{
    label: string; // 태그 텍스트
    emphasis: 'primary' | 'secondary'; // 강조도 (Steam/성향 등)
  }>;

  /**
   * 한 줄 요약 (상세 카드 전용, optional)
   */
  shortSummary?: string;
}

/**
 * UI 전용 Fallback Reason
 *
 * ⚠️ Domain DTO가 아님!
 * - Domain이 만들지 않은 UI 전용 데이터
 * - CoreDTO 형태로 만들지 않음
 */
export interface UIFallbackReason {
  icon: ReactNode;
  text: string;
  isFallback: true; // 항상 true
}

/**
 * Fallback 풀 (상수)
 */
export const FALLBACK_REASONS: UIFallbackReason[] = [
  {
    icon: null, // 아이콘은 reasonFormatter에서 처리
    text: '새로운 조합이라 더 재밌을 수 있어요',
    isFallback: true,
  },
  {
    icon: null,
    text: '함께 플레이하며 취향을 더 맞춰갈 수 있어요',
    isFallback: true,
  },
  {
    icon: null,
    text: '프로필이 채워질수록 더 정교해져요',
    isFallback: true,
  },
];


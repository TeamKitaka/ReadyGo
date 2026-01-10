/**
 * ❗ Domain Contract (DO NOT DIVERGE)
 *
 * - TraitKey는 user_traits 컬럼명과 1:1 매핑
 * - 계산 / 차트 / 매칭 공용 키
 * - 하드코딩 문자열 사용 금지
 */

/**
 * Trait Types & Labels
 * 성향 타입 및 레이블 정의
 */

// ============================================
// Trait Types (성향 키)
// ============================================

export type TraitKey =
  | 'cooperation'
  | 'exploration'
  | 'strategy'
  | 'leadership'
  | 'social';

// ============================================
// Trait Labels (성향 한글 레이블)
// ============================================

export const traitLabels: Record<TraitKey, string> = {
  cooperation: '협동성',
  exploration: '모험성',
  strategy: '전략성',
  leadership: '리더십',
  social: '교류성',
} as const;

// ============================================
// Radar Chart Types
// ============================================

export type RadarTraitKey = TraitKey;

export const radarTraitLabels: Record<RadarTraitKey, string> = traitLabels;

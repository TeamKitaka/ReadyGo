/**
 * 🎨 UI 전용 ViewModel - Match Result
 *
 * 📌 책임 (Responsibility):
 * - UI 렌더링에 필요한 최소 필드만 포함
 * - MatchResultCoreDTO와는 별개로 UI 계층 내부에서만 사용
 * - 컴포넌트 props, Hook 반환값 등에 적용
 * - 문구 조합, UI 표현 단위 (퍼센트, 게이지, 라벨) 담당
 *
 * 📌 Core DTO와의 차이:
 * - Core DTO는 API/Service/FE 공용 타입 (데이터 전송 중심)
 * - ViewModel은 UI 렌더링 관점으로 재구성 (화면 표시 중심)
 * - Core DTO를 직접 extends 또는 포함하지 않음
 *
 * ⚠️ 금지 사항:
 * - API Layer에서 사용 금지
 * - Service/Repository Layer에서 사용 금지
 * - Core DTO를 import하여 재노출(re-export) 금지
 */

/**
 * 매칭 이유 ViewModel
 *
 * UI에서 Reason을 표시하기 위한 전용 타입
 * Core DTO의 구조화된 데이터를 UI 친화적 문구로 변환
 */
export interface MatchReasonViewModel {
  /**
   * 이유 타입
   *
   * Core DTO의 MatchReasonType과 동일
   * UI에서 아이콘, 색상 선택에 사용
   */
  type: string;

  /**
   * 아이콘 이모지
   *
   * UI에서 reason 앞에 표시할 아이콘
   * 예: '🎮', '🤝', '⏰'
   */
  icon: string;

  /**
   * 짧은 라벨
   *
   * 간결한 카테고리 표시용 (프로필 패널, 태그 등)
   * 예: '협동적', '아침형', '리더형'
   */
  label: string;

  /**
   * 메인 문구
   *
   * UI에서 그대로 출력 가능한 자연어 문장
   * 예: '팀 플레이를 중요하게 여겨요', '주로 오전에 활동해요'
   */
  primaryText: string;

  /**
   * 보조 문구 (선택)
   *
   * 메인 문구를 보완하는 추가 정보
   * 예: 'Dota 2, CS2', '협동 성향이 높아요'
   */
  secondaryText?: string;

  /**
   * 강조 표시 여부
   *
   * UI에서 highlight, bold 처리 여부
   * 예: ONLINE_NOW는 항상 true
   */
  isHighlight: boolean;

  /**
   * Fallback 여부
   *
   * Domain에서 의미있는 데이터가 아닌 UI fallback인지 표시
   * true면 연한 스타일로 표시
   */
  isFallback?: boolean;
}

/**
 * 매칭 태그 ViewModel
 *
 * UI에서 Tag를 표시하기 위한 전용 타입
 * Core DTO의 label을 그대로 사용하거나 UI 스타일 추가
 */
export interface MatchTagViewModel {
  /**
   * 태그 라벨
   *
   * Core DTO의 label과 동일
   * UI에서 Badge, Chip으로 그대로 출력
   */
  label: string;

  /**
   * 태그 색상 타입
   *
   * UI에서 Badge, Chip의 색상 스타일 선택
   * 예: 'primary', 'success', 'info', 'warning'
   */
  colorType: 'primary' | 'success' | 'info' | 'warning' | 'default';
}

/**
 * 매칭 점수 표현 ViewModel
 *
 * similarityScore를 UI 표현 단위로 변환
 */
export interface MatchScoreViewModel {
  /**
   * 원본 점수 (0~100)
   */
  score: number;

  /**
   * 퍼센트 표시용 문자열
   *
   * 예: '87%'
   */
  percentText: string;

  /**
   * 게이지 진행률 (0~1)
   *
   * Progress Bar, Gauge 컴포넌트에서 사용
   * 예: 0.87
   */
  gaugeValue: number;

  /**
   * 등급 라벨
   *
   * 점수 범위에 따른 등급 문구
   * 예: '높은 매칭', '보통 매칭', '낮은 매칭'
   */
  gradeLabel: string;

  /**
   * 등급 색상 타입
   *
   * UI에서 색상 스타일 선택
   * 예: 'high', 'medium', 'low'
   */
  gradeColor: 'high' | 'medium' | 'low';
}

/**
 * 파티 성공 확률 표현 ViewModel
 *
 * PartyMatchSummaryCoreDTO의 successProbability를 UI 표현 단위로 변환
 */
export interface PartySuccessViewModel {
  /**
   * 원본 확률 (0~100)
   */
  probability: number;

  /**
   * 퍼센트 표시용 문자열
   *
   * 예: '85%'
   */
  percentText: string;

  /**
   * 성공률 라벨
   *
   * 확률 범위에 따른 라벨 문구
   * 예: '높은 성공률', '보통 성공률', '낮은 성공률'
   */
  successLabel: string;

  /**
   * 성공률 색상 타입
   *
   * UI에서 색상 스타일 선택
   * 예: 'high', 'medium', 'low'
   */
  successColor: 'high' | 'medium' | 'low';
}

/**
 * MatchResultViewModel
 *
 * UI에서 매칭 결과를 렌더링하기 위한 전용 타입
 *
 * 📌 사용처:
 * - match 페이지: 상세 매칭 결과 표시
 * - home 대시보드: 추천 사용자 목록 표시
 *
 * 📌 사용 예시:
 * ```typescript
 * interface MatchCardProps {
 *   match: MatchResultViewModel;
 * }
 *
 * export function MatchCard({ match }: MatchCardProps) {
 *   return (
 *     <Card>
 *       <ScoreGauge
 *         value={match.score.gaugeValue}
 *         label={match.score.gradeLabel}
 *         color={match.score.gradeColor}
 *       />
 *       <ReasonList reasons={match.reasons} />
 *       <TagList tags={match.tags} />
 *       {match.onlineBadge && <Badge>{match.onlineBadge}</Badge>}
 *     </Card>
 *   );
 * }
 * ```
 */
export interface MatchResultViewModel {
  /**
   * Viewer 사용자 ID
   */
  userId: string;

  /**
   * 매칭 대상 사용자 ID
   */
  targetUserId: string;

  /**
   * 매칭 점수 표현
   *
   * similarityScore를 UI 표현 단위로 변환
   */
  score: MatchScoreViewModel;

  /**
   * 매칭 이유 목록
   *
   * UI 친화적 문구로 변환된 Reason 목록
   * 최소 3개 이상 항상 포함
   */
  reasons: MatchReasonViewModel[];

  /**
   * 매칭 태그 목록
   *
   * UI 스타일이 추가된 Tag 목록
   * 최소 3개 이상 항상 포함
   */
  tags: MatchTagViewModel[];

  /**
   * 온라인 배지 문구 (선택)
   *
   * isOnlineMatched가 true일 때만 표시
   * 예: '지금 온라인', '접속 중'
   */
  onlineBadge?: string;

  /**
   * 계산 시점 표시 문구 (선택)
   *
   * computedAt을 상대 시간으로 변환
   * 예: '5분 전', '1시간 전', '오늘'
   */
  computedTimeText?: string;
}

/**
 * PartyMatchSummaryViewModel
 *
 * UI에서 파티 매칭 성공 확률을 렌더링하기 위한 전용 타입
 */
export interface PartyMatchSummaryViewModel {
  /**
   * Viewer 사용자 ID
   */
  userId: string;

  /**
   * 매칭 대상 사용자 ID
   */
  targetUserId: string;

  /**
   * 파티 성공 확률 표현
   *
   * successProbability를 UI 표현 단위로 변환
   */
  success: PartySuccessViewModel;

  /**
   * 성공 확률 근거 목록
   *
   * UI 친화적 문구로 변환된 Reason 목록
   * 최소 3개 이상 항상 포함
   */
  reasons: MatchReasonViewModel[];

  /**
   * 계산 시점 표시 문구 (선택)
   *
   * computedAt을 상대 시간으로 변환
   * 예: '5분 전', '1시간 전', '오늘'
   */
  computedTimeText?: string;
}

/**
 * 📌 ViewModel 생성 정책:
 *
 * 1. Core DTO → ViewModel 변환은 toMatchResultViewModel 함수에서 수행
 * 2. 문구 조합, UI 표현 단위 변환은 ViewModel에서 종료
 * 3. UI 컴포넌트는 조건 분기/문구 생성 금지, 렌더링만 담당
 * 4. Steam 미연동 Cold Start 시나리오에서도 완결된 ViewModel 생성
 * 5. home / match 페이지 공용 사용 가능
 */

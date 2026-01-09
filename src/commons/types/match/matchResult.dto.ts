/**
 * ❗ Match Result DTO
 *
 * 📌 책임 (Responsibility):
 * - Match Domain 계산 결과를 담는 DTO
 * - finalScore + availability 메타 정보 포함
 * - UI와 Domain 간 결과 데이터 전달
 *
 * 📌 설계 원칙:
 * - Domain 계산 결과만 포함 (계산 과정 중간 값 포함 X)
 * - 메타 정보로 온라인 상태 및 가용성 힌트 제공
 * - UI는 이 DTO만 사용하여 매칭 결과 표시
 */

/**
 * Match 계산 결과
 *
 * 📌 필수 필드:
 * - finalScore: 최종 매칭 점수 (0~100)
 * - isOnlineMatched: target이 현재 온라인인지 여부
 * - availabilityHint: 가용성 힌트 ('online' | 'offline' | 'unknown')
 *
 * 📌 사용 예시:
 * ```typescript
 * const result: MatchResultDTO = {
 *   finalScore: 85,
 *   isOnlineMatched: true,
 *   availabilityHint: 'online'
 * };
 *
 * // UI에서 사용
 * <MatchCard
 *   score={result.finalScore}
 *   isOnline={result.isOnlineMatched}
 *   hint={result.availabilityHint}
 * />
 * ```
 */
export interface MatchResultDTO {
  /**
   * 최종 매칭 점수 (0~100)
   *
   * 필수 필드
   * - Base Similarity + 모든 factor 적용 후 최종 점수
   * - 0~100 범위로 clamp 및 round 처리됨
   */
  finalScore: number;

  /**
   * Target이 현재 온라인인지 여부
   *
   * 필수 필드
   * - true: target이 현재 온라인
   * - false: target이 현재 오프라인 또는 온라인 상태 미확인
   */
  isOnlineMatched: boolean;

  /**
   * 가용성 힌트
   *
   * 필수 필드
   * - 'online': target이 현재 온라인 (즉시 매칭 가능)
   * - 'offline': target이 현재 오프라인 (매칭 가능하지만 응답 지연 가능)
   * - 'unknown': target의 온라인 상태 미확인
   */
  availabilityHint: 'online' | 'offline' | 'unknown';
}



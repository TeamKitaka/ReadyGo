/**
 * 후기 답변을 기반으로 온도 점수 계산
 *
 * 책임:
 * - 후기 답변(Yes/No)을 기반으로 온도 점수 변화량 계산
 * - Yes 1개 = +0.15점
 * - 최대 +0.75점 (5문항 모두 Yes)
 */

export type ReviewAnswers = {
  manner: [boolean, boolean]; // 매너 2개
  teamwork: [boolean]; // 팀워크 1개
  communication: [boolean, boolean]; // 소통 2개
  comment?: string; // 선택적 코멘트
};

const SCORE_PER_YES = 0.15; // Yes 1개당 점수
const MAX_SCORE = 0.75; // 최대 점수 (5문항 모두 Yes)

/**
 * 후기 답변을 기반으로 온도 점수 변화량 계산
 *
 * @param answers - 후기 답변
 * @returns 온도 점수 변화량 (0 ~ 0.75)
 *
 * @example
 * ```typescript
 * const answers: ReviewAnswers = {
 *   manner: [true, true],
 *   teamwork: [true],
 *   communication: [true, true],
 * };
 * const score = calculateTemperatureFromReview(answers); // 0.75
 * ```
 */
export const calculateTemperatureFromReview = (
  answers: ReviewAnswers
): number => {
  let yesCount = 0;

  // 매너 2개
  if (answers.manner[0]) {
    yesCount++;
  }
  if (answers.manner[1]) {
    yesCount++;
  }

  // 팀워크 1개
  if (answers.teamwork[0]) {
    yesCount++;
  }

  // 소통 2개
  if (answers.communication[0]) {
    yesCount++;
  }
  if (answers.communication[1]) {
    yesCount++;
  }

  // 점수 계산 (Yes 개수 × 0.15)
  const score = yesCount * SCORE_PER_YES;

  // 최대 점수 제한
  return Math.min(score, MAX_SCORE);
};

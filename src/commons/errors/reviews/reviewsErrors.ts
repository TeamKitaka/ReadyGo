/**
 * Reviews 도메인 전용 에러 정의
 *
 * 책임:
 * - Service 레이어에서만 사용되는 명시적 에러 클래스 제공
 * - 에러 코드와 메시지를 통일된 규칙으로 관리
 *
 * 비책임:
 * - UI 노출 메시지 (i18n / 사용자 문구)
 * - Repository 레벨 에러 정의
 */

/**
 * ReviewNotFoundError
 *
 * 발생 조건:
 * - reviews 테이블에 해당 reviewId의 레코드가 존재하지 않음
 *
 * 처리 방침:
 * - 404 에러로 처리
 */
export class ReviewNotFoundError extends Error {
  readonly code = 'REVIEW_NOT_FOUND';
  readonly statusCode = 404;

  constructor(reviewId: number) {
    super(`Review not found for reviewId: ${reviewId}`);
    this.name = 'ReviewNotFoundError';

    // Error 클래스 상속 시 prototype chain 보정
    Object.setPrototypeOf(this, ReviewNotFoundError.prototype);
  }
}

/**
 * ReviewFetchError
 *
 * 발생 조건:
 * - Repository 호출 시 Supabase 에러 발생
 * - 네트워크 문제, DB 연결 실패, 권한 문제 등
 *
 * 처리 방침:
 * - 즉시 throw, 원본 에러 메시지 포함
 * - UI에서는 500 에러 페이지 또는 "일시적인 오류" 메시지 표시
 */
export class ReviewFetchError extends Error {
  readonly code = 'REVIEW_FETCH_ERROR';
  readonly statusCode = 500;
  readonly originalError?: string;

  constructor(
    resource: 'review' | 'reviews',
    originalError?: string
  ) {
    super(`Failed to fetch ${resource}: ${originalError || 'Unknown error'}`);
    this.name = 'ReviewFetchError';
    this.originalError = originalError;

    // Error 클래스 상속 시 prototype chain 보정
    Object.setPrototypeOf(this, ReviewFetchError.prototype);
  }
}

/**
 * ReviewCreateError
 *
 * 발생 조건:
 * - 리뷰 생성 시 Supabase 에러 발생
 *
 * 처리 방침:
 * - 즉시 throw, 원본 에러 메시지 포함
 * - UI에서는 500 에러 페이지 또는 "생성 실패" 메시지 표시
 */
export class ReviewCreateError extends Error {
  readonly code = 'REVIEW_CREATE_ERROR';
  readonly statusCode = 500;
  readonly originalError?: string;

  constructor(originalError?: string) {
    super(`Failed to create review: ${originalError || 'Unknown error'}`);
    this.name = 'ReviewCreateError';
    this.originalError = originalError;

    // Error 클래스 상속 시 prototype chain 보정
    Object.setPrototypeOf(this, ReviewCreateError.prototype);
  }
}

/**
 * ReviewValidationError
 *
 * 발생 조건:
 * - 입력 파라미터 검증 실패
 * - 비즈니스 규칙 위반
 *
 * 처리 방침:
 * - 400 에러로 처리
 */
export class ReviewValidationError extends Error {
  readonly code = 'REVIEW_VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ReviewValidationError';

    // Error 클래스 상속 시 prototype chain 보정
    Object.setPrototypeOf(this, ReviewValidationError.prototype);
  }
}

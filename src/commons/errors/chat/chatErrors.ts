/**
 * Chat 도메인 전용 에러 정의
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
 * ChatRoomNotFoundError
 *
 * 발생 조건:
 * - chat_rooms 테이블에 해당 roomId의 레코드가 존재하지 않음
 * - 또는 사용자가 접근 권한이 없는 채팅방
 *
 * 처리 방침:
 * - 404 에러로 처리
 */
export class ChatRoomNotFoundError extends Error {
  readonly code = 'CHAT_ROOM_NOT_FOUND';
  readonly statusCode = 404;

  constructor(roomId: number | string) {
    super(`Chat room not found for roomId: ${roomId}`);
    this.name = 'ChatRoomNotFoundError';

    // Error 클래스 상속 시 prototype chain 보정
    Object.setPrototypeOf(this, ChatRoomNotFoundError.prototype);
  }
}

/**
 * ChatMessageNotFoundError
 *
 * 발생 조건:
 * - chat_messages 테이블에 해당 messageId의 레코드가 존재하지 않음
 *
 * 처리 방침:
 * - 404 에러로 처리
 */
export class ChatMessageNotFoundError extends Error {
  readonly code = 'CHAT_MESSAGE_NOT_FOUND';
  readonly statusCode = 404;

  constructor(messageId: number) {
    super(`Chat message not found for messageId: ${messageId}`);
    this.name = 'ChatMessageNotFoundError';

    // Error 클래스 상속 시 prototype chain 보정
    Object.setPrototypeOf(this, ChatMessageNotFoundError.prototype);
  }
}

/**
 * ChatRoomAccessDeniedError
 *
 * 발생 조건:
 * - 사용자가 해당 채팅방에 접근 권한이 없음
 * - chat_room_members에 해당 사용자가 없음
 *
 * 처리 방침:
 * - 403 에러로 처리
 */
export class ChatRoomAccessDeniedError extends Error {
  readonly code = 'CHAT_ROOM_ACCESS_DENIED';
  readonly statusCode = 403;

  constructor(roomId: number, userId: string) {
    super(`User ${userId} does not have access to chat room ${roomId}`);
    this.name = 'ChatRoomAccessDeniedError';

    // Error 클래스 상속 시 prototype chain 보정
    Object.setPrototypeOf(this, ChatRoomAccessDeniedError.prototype);
  }
}

/**
 * ChatFetchError
 *
 * 발생 조건:
 * - Repository 호출 시 Supabase 에러 발생
 * - 네트워크 문제, DB 연결 실패, 권한 문제 등
 *
 * 처리 방침:
 * - 즉시 throw, 원본 에러 메시지 포함
 * - UI에서는 500 에러 페이지 또는 "일시적인 오류" 메시지 표시
 */
export class ChatFetchError extends Error {
  readonly code = 'CHAT_FETCH_ERROR';
  readonly statusCode = 500;
  readonly originalError?: string;

  constructor(
    resource:
      | 'room'
      | 'rooms'
      | 'message'
      | 'messages'
      | 'members'
      | 'reads'
      | 'post'
      | 'posts',
    originalError?: string
  ) {
    super(`Failed to fetch ${resource}: ${originalError || 'Unknown error'}`);
    this.name = 'ChatFetchError';
    this.originalError = originalError;

    // Error 클래스 상속 시 prototype chain 보정
    Object.setPrototypeOf(this, ChatFetchError.prototype);
  }
}

/**
 * ChatCreateError
 *
 * 발생 조건:
 * - 채팅방 또는 메시지 생성 시 Supabase 에러 발생
 *
 * 처리 방침:
 * - 즉시 throw, 원본 에러 메시지 포함
 * - UI에서는 500 에러 페이지 또는 "생성 실패" 메시지 표시
 */
export class ChatCreateError extends Error {
  readonly code = 'CHAT_CREATE_ERROR';
  readonly statusCode = 500;
  readonly originalError?: string;

  constructor(resource: 'room' | 'message' | 'post', originalError?: string) {
    super(`Failed to create ${resource}: ${originalError || 'Unknown error'}`);
    this.name = 'ChatCreateError';
    this.originalError = originalError;

    // Error 클래스 상속 시 prototype chain 보정
    Object.setPrototypeOf(this, ChatCreateError.prototype);
  }
}

/**
 * ChatUpdateError
 *
 * 발생 조건:
 * - 메시지 읽음 처리 등 업데이트 시 Supabase 에러 발생
 *
 * 처리 방침:
 * - 즉시 throw, 원본 에러 메시지 포함
 */
export class ChatUpdateError extends Error {
  readonly code = 'CHAT_UPDATE_ERROR';
  readonly statusCode = 500;
  readonly originalError?: string;

  constructor(
    resource: 'read_status' | 'message' | 'post',
    originalError?: string
  ) {
    super(`Failed to update ${resource}: ${originalError || 'Unknown error'}`);
    this.name = 'ChatUpdateError';
    this.originalError = originalError;

    // Error 클래스 상속 시 prototype chain 보정
    Object.setPrototypeOf(this, ChatUpdateError.prototype);
  }
}

/**
 * ChatValidationError
 *
 * 발생 조건:
 * - 입력 파라미터 검증 실패
 * - 비즈니스 규칙 위반
 *
 * 처리 방침:
 * - 400 에러로 처리
 */
export class ChatValidationError extends Error {
  readonly code = 'CHAT_VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ChatValidationError';

    // Error 클래스 상속 시 prototype chain 보정
    Object.setPrototypeOf(this, ChatValidationError.prototype);
  }
}

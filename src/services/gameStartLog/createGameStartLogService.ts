import * as gameStartLogRepository from '@/repositories/gameStartLog.repository';
import {
  GameStartLogCreateError,
  GameStartLogValidationError,
} from '@/commons/errors/gameStartLog/gameStartLogErrors';
import type { CreateGameStartLogParams } from '@/repositories/gameStartLog.repository';

/**
 * 게임 시작 로그 작성 Service
 *
 * 책임:
 * - 입력 검증 (모든 필수 필드)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const createGameStartLogService = async (
  params: CreateGameStartLogParams
) => {
  // 입력 검증
  if (
    !params.actor_id ||
    typeof params.actor_id !== 'string' ||
    !params.actor_id.trim()
  ) {
    throw new GameStartLogValidationError(
      'actor_id는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (
    !params.context_type ||
    typeof params.context_type !== 'string' ||
    !params.context_type.trim()
  ) {
    throw new GameStartLogValidationError(
      'context_type은 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (
    !params.context_id ||
    typeof params.context_id !== 'string' ||
    !params.context_id.trim()
  ) {
    throw new GameStartLogValidationError(
      'context_id는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  // game_id는 선택적이지만, 제공된 경우 검증
  if (params.game_id !== undefined && params.game_id !== null) {
    if (typeof params.game_id !== 'string' || !params.game_id.trim()) {
      throw new GameStartLogValidationError(
        'game_id는 비어있지 않은 문자열이어야 합니다.'
      );
    }
  }

  // game_name은 선택적이지만, 제공된 경우 검증
  if (params.game_name !== undefined && params.game_name !== null) {
    if (typeof params.game_name !== 'string' || !params.game_name.trim()) {
      throw new GameStartLogValidationError(
        'game_name은 비어있지 않은 문자열이어야 합니다.'
      );
    }
  }

  // 문자열 필드 trim 처리
  const validatedParams: CreateGameStartLogParams = {
    actor_id: params.actor_id.trim(),
    context_type: params.context_type.trim(),
    context_id: params.context_id.trim(),
    game_id: params.game_id ? params.game_id.trim() : null,
    game_name: params.game_name ? params.game_name.trim() : null,
  };

  try {
    const log =
      await gameStartLogRepository.createGameStartLog(validatedParams);

    if (!log) {
      throw new GameStartLogCreateError('게임 시작 로그 생성에 실패했습니다.');
    }

    return log;
  } catch (error) {
    if (
      error instanceof GameStartLogCreateError ||
      error instanceof GameStartLogValidationError
    ) {
      throw error;
    }

    throw new GameStartLogCreateError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

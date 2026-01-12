import * as gameStartLogRepository from '@/repositories/gameStartLog.repository';
import {
  GameStartLogFetchError,
  GameStartLogValidationError,
} from '@/commons/errors/gameStartLog/gameStartLogErrors';

/**
 * 특정 컨텍스트에서 발생한 게임 시작 로그 목록 조회 Service
 *
 * 책임:
 * - 입력 검증 (contextType, contextId, limit, offset)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const getGameStartLogsByContextService = async (
  contextType: string,
  contextId: string,
  limit: number = 50,
  offset: number = 0
) => {
  // 입력 검증
  if (!contextType || typeof contextType !== 'string' || !contextType.trim()) {
    throw new GameStartLogValidationError(
      'contextType은 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (!contextId || typeof contextId !== 'string' || !contextId.trim()) {
    throw new GameStartLogValidationError(
      'contextId는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
    throw new GameStartLogValidationError(
      'limit은 1 이상의 숫자여야 합니다.'
    );
  }

  if (typeof offset !== 'number' || isNaN(offset) || offset < 0) {
    throw new GameStartLogValidationError(
      'offset은 0 이상의 숫자여야 합니다.'
    );
  }

  try {
    const logs = await gameStartLogRepository.getGameStartLogsByContext(
      contextType.trim(),
      contextId.trim(),
      limit,
      offset
    );
    return logs;
  } catch (error) {
    if (error instanceof GameStartLogValidationError) {
      throw error;
    }

    throw new GameStartLogFetchError(
      'logs',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

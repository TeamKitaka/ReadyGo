import * as gameStartLogRepository from '@/repositories/gameStartLog.repository';
import {
  GameStartLogFetchError,
  GameStartLogValidationError,
} from '@/commons/errors/gameStartLog/gameStartLogErrors';

/**
 * 특정 유저가 남긴 게임 시작 로그 목록 조회 Service
 *
 * 책임:
 * - 입력 검증 (actorId, limit, offset)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const getGameStartLogsByActorService = async (
  actorId: string,
  limit: number = 50,
  offset: number = 0
) => {
  // 입력 검증
  if (!actorId || typeof actorId !== 'string' || !actorId.trim()) {
    throw new GameStartLogValidationError(
      'actorId는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
    throw new GameStartLogValidationError('limit은 1 이상의 숫자여야 합니다.');
  }

  if (typeof offset !== 'number' || isNaN(offset) || offset < 0) {
    throw new GameStartLogValidationError('offset은 0 이상의 숫자여야 합니다.');
  }

  try {
    const logs = await gameStartLogRepository.getGameStartLogsByActor(
      actorId.trim(),
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

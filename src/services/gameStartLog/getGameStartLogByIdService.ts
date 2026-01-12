import * as gameStartLogRepository from '@/repositories/gameStartLog.repository';
import {
  GameStartLogFetchError,
  GameStartLogNotFoundError,
  GameStartLogValidationError,
} from '@/commons/errors/gameStartLog/gameStartLogErrors';

/**
 * 특정 게임 시작 로그 ID로 로그를 조회 Service
 *
 * 책임:
 * - 입력 검증 (logId)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const getGameStartLogByIdService = async (logId: number) => {
  // 입력 검증
  if (typeof logId !== 'number' || isNaN(logId) || logId < 1) {
    throw new GameStartLogValidationError(
      'logId는 1 이상의 숫자여야 합니다.'
    );
  }

  try {
    const log = await gameStartLogRepository.getGameStartLogById(logId);

    if (!log) {
      throw new GameStartLogNotFoundError(logId);
    }

    return log;
  } catch (error) {
    if (
      error instanceof GameStartLogNotFoundError ||
      error instanceof GameStartLogValidationError
    ) {
      throw error;
    }

    throw new GameStartLogFetchError(
      'log',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

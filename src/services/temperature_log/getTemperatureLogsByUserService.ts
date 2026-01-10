import * as temperatureLogRepository from '@/repositories/temperatureLog.repository';
import {
  TemperatureLogFetchError,
  TemperatureLogValidationError,
} from '@/commons/errors/temperatureLog/temperatureLogErrors';

/**
 * 특정 사용자의 온도로그 목록 조회 Service
 *
 * 책임:
 * - 입력 검증 (userId, limit, offset)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const getTemperatureLogsByUserService = async (
  userId: string,
  limit: number = 50,
  offset: number = 0
) => {
  // 입력 검증
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new TemperatureLogValidationError(
      'userId는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
    throw new TemperatureLogValidationError(
      'limit은 1 이상의 숫자여야 합니다.'
    );
  }

  if (typeof offset !== 'number' || isNaN(offset) || offset < 0) {
    throw new TemperatureLogValidationError(
      'offset은 0 이상의 숫자여야 합니다.'
    );
  }

  try {
    const logs = await temperatureLogRepository.getTemperatureLogsByUser(
      userId.trim(),
      limit,
      offset
    );
    return logs;
  } catch (error) {
    if (error instanceof TemperatureLogValidationError) {
      throw error;
    }

    throw new TemperatureLogFetchError(
      'logs',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

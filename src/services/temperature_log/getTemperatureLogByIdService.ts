import * as temperatureLogRepository from '@/repositories/temperatureLog.repository';
import {
  TemperatureLogFetchError,
  TemperatureLogNotFoundError,
  TemperatureLogValidationError,
} from '@/commons/errors/temperatureLog/temperatureLogErrors';

/**
 * 특정 온도로그 ID로 로그를 조회 Service
 *
 * 책임:
 * - 입력 검증 (logId)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const getTemperatureLogByIdService = async (logId: number) => {
  // 입력 검증
  if (typeof logId !== 'number' || isNaN(logId) || logId < 1) {
    throw new TemperatureLogValidationError(
      'logId는 1 이상의 숫자여야 합니다.'
    );
  }

  try {
    const log = await temperatureLogRepository.getTemperatureLogById(logId);

    if (!log) {
      throw new TemperatureLogNotFoundError(logId);
    }

    return log;
  } catch (error) {
    if (
      error instanceof TemperatureLogNotFoundError ||
      error instanceof TemperatureLogValidationError
    ) {
      throw error;
    }

    throw new TemperatureLogFetchError(
      'log',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

import * as temperatureLogRepository from '@/repositories/temperatureLog.repository';
import {
  TemperatureLogCreateError,
  TemperatureLogValidationError,
} from '@/commons/errors/temperatureLog/temperatureLogErrors';
import type { CreateTemperatureLogParams } from '@/repositories/temperatureLog.repository';

/**
 * 온도로그 작성 Service
 *
 * 책임:
 * - 입력 검증 (모든 필수 필드)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const createTemperatureLogService = async (
  params: CreateTemperatureLogParams
) => {
  // 입력 검증
  if (
    !params.user_id ||
    typeof params.user_id !== 'string' ||
    !params.user_id.trim()
  ) {
    throw new TemperatureLogValidationError(
      'user_id는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (typeof params.change !== 'number' || isNaN(params.change)) {
    throw new TemperatureLogValidationError('change는 숫자여야 합니다.');
  }

  // reason은 선택적이지만, 제공된 경우 검증
  if (params.reason !== undefined && params.reason !== null) {
    if (typeof params.reason !== 'string') {
      throw new TemperatureLogValidationError('reason은 문자열이어야 합니다.');
    }
  }

  // 문자열 필드 trim 처리
  const validatedParams: CreateTemperatureLogParams = {
    user_id: params.user_id.trim(),
    change: params.change,
    reason: params.reason ? params.reason.trim() : null,
  };

  try {
    const log =
      await temperatureLogRepository.createTemperatureLog(validatedParams);

    if (!log) {
      throw new TemperatureLogCreateError('온도로그 생성에 실패했습니다.');
    }

    return log;
  } catch (error) {
    if (
      error instanceof TemperatureLogCreateError ||
      error instanceof TemperatureLogValidationError
    ) {
      throw error;
    }

    throw new TemperatureLogCreateError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

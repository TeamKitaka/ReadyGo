import * as tierHistoryRepository from '@/repositories/tierHistory.repository';
import {
  TierHistoryFetchError,
  TierHistoryNotFoundError,
  TierHistoryValidationError,
} from '@/commons/errors/tierHistory/tierHistoryErrors';

/**
 * 특정 티어 히스토리 ID로 기록을 조회 Service
 *
 * 책임:
 * - 입력 검증 (historyId)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const getTierHistoryByIdService = async (
  historyId: number
) => {
  // 입력 검증
  if (typeof historyId !== 'number' || isNaN(historyId) || historyId < 1) {
    throw new TierHistoryValidationError('historyId는 1 이상의 숫자여야 합니다.');
  }

  try {
    const history = await tierHistoryRepository.getTierHistoryById(historyId);

    if (!history) {
      throw new TierHistoryNotFoundError(historyId);
    }

    return history;
  } catch (error) {
    if (
      error instanceof TierHistoryNotFoundError ||
      error instanceof TierHistoryValidationError
    ) {
      throw error;
    }

    throw new TierHistoryFetchError(
      'history',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

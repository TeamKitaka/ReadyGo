import * as tierHistoryRepository from '@/repositories/tierHistory.repository';
import {
  TierHistoryFetchError,
  TierHistoryValidationError,
} from '@/commons/errors/tierHistory/tierHistoryErrors';

/**
 * 특정 사용자의 티어 히스토리 목록 조회 Service
 *
 * 책임:
 * - 입력 검증 (userId, limit, offset)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const getTierHistoryByUserService = async (
  userId: string,
  limit: number = 50,
  offset: number = 0
) => {
  // 입력 검증
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new TierHistoryValidationError(
      'userId는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
    throw new TierHistoryValidationError('limit은 1 이상의 숫자여야 합니다.');
  }

  if (typeof offset !== 'number' || isNaN(offset) || offset < 0) {
    throw new TierHistoryValidationError('offset은 0 이상의 숫자여야 합니다.');
  }

  try {
    const histories = await tierHistoryRepository.getTierHistoryByUser(
      userId.trim(),
      limit,
      offset
    );
    return histories;
  } catch (error) {
    if (error instanceof TierHistoryValidationError) {
      throw error;
    }

    throw new TierHistoryFetchError(
      'histories',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

import * as tierHistoryRepository from '@/repositories/tierHistory.repository';
import {
  TierHistoryCreateError,
  TierHistoryValidationError,
} from '@/commons/errors/tierHistory/tierHistoryErrors';
import type { CreateTierHistoryParams } from '@/repositories/tierHistory.repository';

/**
 * 티어 히스토리 작성 Service
 *
 * 책임:
 * - 입력 검증 (모든 필수 필드)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const createTierHistoryService = async (
  params: CreateTierHistoryParams
) => {
  // 입력 검증
  if (
    !params.user_id ||
    typeof params.user_id !== 'string' ||
    !params.user_id.trim()
  ) {
    throw new TierHistoryValidationError(
      'user_id는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (
    !params.previous_tier ||
    typeof params.previous_tier !== 'string' ||
    !params.previous_tier.trim()
  ) {
    throw new TierHistoryValidationError(
      'previous_tier는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (
    !params.current_tier ||
    typeof params.current_tier !== 'string' ||
    !params.current_tier.trim()
  ) {
    throw new TierHistoryValidationError(
      'current_tier는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  // 문자열 필드 trim 처리
  const validatedParams: CreateTierHistoryParams = {
    user_id: params.user_id.trim(),
    previous_tier: params.previous_tier.trim(),
    current_tier: params.current_tier.trim(),
  };

  try {
    const history =
      await tierHistoryRepository.createTierHistory(validatedParams);

    if (!history) {
      throw new TierHistoryCreateError('티어 히스토리 생성에 실패했습니다.');
    }

    return history;
  } catch (error) {
    if (
      error instanceof TierHistoryCreateError ||
      error instanceof TierHistoryValidationError
    ) {
      throw error;
    }

    throw new TierHistoryCreateError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

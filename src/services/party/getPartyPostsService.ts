import * as partyPostsRepository from '@/repositories/partyPosts.repository';
import {
  ChatFetchError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';
import type {
  PartyPost,
  GetPartyPostsOptions,
} from '@/repositories/partyPosts.repository';

/**
 * 파티 게시물 목록 조회 Service
 *
 * 책임:
 * - 입력 검증 (limit, offset, creatorId, gameTitle, status)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const getPartyPostsService = async (
  options?: GetPartyPostsOptions
): Promise<PartyPost[]> => {
  // 입력 검증
  if (options?.limit !== undefined) {
    if (
      typeof options.limit !== 'number' ||
      isNaN(options.limit) ||
      options.limit < 1
    ) {
      throw new ChatValidationError('limit은 1 이상의 숫자여야 합니다.');
    }
  }

  if (options?.offset !== undefined) {
    if (
      typeof options.offset !== 'number' ||
      isNaN(options.offset) ||
      options.offset < 0
    ) {
      throw new ChatValidationError('offset은 0 이상의 숫자여야 합니다.');
    }
  }

  // 검증 및 trim 처리된 옵션 생성
  const validatedOptions: GetPartyPostsOptions = { ...options };

  if (options?.creatorId !== undefined) {
    if (
      !options.creatorId ||
      typeof options.creatorId !== 'string' ||
      !options.creatorId.trim()
    ) {
      throw new ChatValidationError(
        'creatorId는 비어있지 않은 문자열이어야 합니다.'
      );
    }
    validatedOptions.creatorId = options.creatorId.trim();
  }

  if (options?.gameTitle !== undefined) {
    if (
      !options.gameTitle ||
      typeof options.gameTitle !== 'string' ||
      !options.gameTitle.trim()
    ) {
      throw new ChatValidationError(
        'gameTitle은 비어있지 않은 문자열이어야 합니다.'
      );
    }
    validatedOptions.gameTitle = options.gameTitle.trim();
  }

  if (options?.status !== undefined) {
    if (
      !options.status ||
      typeof options.status !== 'string' ||
      !options.status.trim()
    ) {
      throw new ChatValidationError(
        'status는 비어있지 않은 문자열이어야 합니다.'
      );
    }
    validatedOptions.status = options.status.trim();
  }

  try {
    const posts = await partyPostsRepository.getPartyPosts(validatedOptions);
    return posts;
  } catch (error) {
    throw new ChatFetchError(
      'posts',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

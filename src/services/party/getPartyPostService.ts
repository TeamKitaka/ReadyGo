import * as partyPostsRepository from '@/repositories/partyPosts.repository';
import {
  ChatFetchError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';
import type { PartyPost } from '@/repositories/partyPosts.repository';

/**
 * 파티 게시물 단일 조회 Service
 *
 * 책임:
 * - 입력 검증 (postId)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const getPartyPostService = async (
  postId: number
): Promise<PartyPost | null> => {
  // 입력 검증
  if (typeof postId !== 'number' || isNaN(postId) || postId <= 0) {
    throw new ChatValidationError('postId는 양수여야 합니다.');
  }

  try {
    const post = await partyPostsRepository.getPartyPost(postId);
    return post;
  } catch (error) {
    throw new ChatFetchError(
      'post',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

import * as partyPostsRepository from '@/repositories/partyPosts.repository';
import {
  ChatUpdateError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';

/**
 * 파티 게시물 삭제 Service
 *
 * 책임:
 * - 입력 검증 (postId)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const deletePartyPostService = async (postId: number): Promise<void> => {
  // 입력 검증
  if (typeof postId !== 'number' || isNaN(postId) || postId <= 0) {
    throw new ChatValidationError('postId는 양수여야 합니다.');
  }

  try {
    await partyPostsRepository.deletePartyPost(postId);
  } catch (error) {
    throw new ChatUpdateError(
      'post',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

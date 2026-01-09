import * as partyPostsRepository from '@/repositories/partyPosts.repository';
import {
  ChatUpdateError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';
import type {
  PartyPost,
  UpdatePartyPostInput,
} from '@/repositories/partyPosts.repository';

/**
 * 파티 게시물 수정 Service
 *
 * 책임:
 * - 입력 검증 (postId, input 필드들)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const updatePartyPostService = async (
  postId: number,
  input: UpdatePartyPostInput
): Promise<PartyPost> => {
  // 입력 검증
  if (typeof postId !== 'number' || isNaN(postId) || postId <= 0) {
    throw new ChatValidationError('postId는 양수여야 합니다.');
  }

  // 제공된 필드에 대해서만 검증
  if (input.game_title !== undefined) {
    if (
      !input.game_title ||
      typeof input.game_title !== 'string' ||
      !input.game_title.trim()
    ) {
      throw new ChatValidationError(
        'game_title은 비어있지 않은 문자열이어야 합니다.'
      );
    }
  }

  if (input.party_title !== undefined) {
    if (
      !input.party_title ||
      typeof input.party_title !== 'string' ||
      !input.party_title.trim()
    ) {
      throw new ChatValidationError(
        'party_title은 비어있지 않은 문자열이어야 합니다.'
      );
    }
  }

  if (input.description !== undefined) {
    if (
      !input.description ||
      typeof input.description !== 'string' ||
      !input.description.trim()
    ) {
      throw new ChatValidationError(
        'description은 비어있지 않은 문자열이어야 합니다.'
      );
    }
  }

  if (input.max_members !== undefined) {
    if (
      typeof input.max_members !== 'number' ||
      isNaN(input.max_members) ||
      input.max_members <= 0
    ) {
      throw new ChatValidationError('max_members는 양수여야 합니다.');
    }
  }

  if (input.control_level !== undefined) {
    if (
      !input.control_level ||
      typeof input.control_level !== 'string' ||
      !input.control_level.trim()
    ) {
      throw new ChatValidationError(
        'control_level은 비어있지 않은 문자열이어야 합니다.'
      );
    }
  }

  if (input.difficulty !== undefined) {
    if (
      !input.difficulty ||
      typeof input.difficulty !== 'string' ||
      !input.difficulty.trim()
    ) {
      throw new ChatValidationError(
        'difficulty는 비어있지 않은 문자열이어야 합니다.'
      );
    }
  }

  // 문자열 필드 trim 처리
  const trimmedInput: UpdatePartyPostInput = {
    ...input,
    ...(input.game_title !== undefined && {
      game_title: input.game_title.trim(),
    }),
    ...(input.party_title !== undefined && {
      party_title: input.party_title.trim(),
    }),
    ...(input.description !== undefined && {
      description: input.description.trim(),
    }),
    ...(input.control_level !== undefined && {
      control_level: input.control_level.trim(),
    }),
    ...(input.difficulty !== undefined && {
      difficulty: input.difficulty.trim(),
    }),
  };

  try {
    const post = await partyPostsRepository.updatePartyPost(
      postId,
      trimmedInput
    );

    if (!post) {
      throw new ChatUpdateError('post', '파티 게시물 수정에 실패했습니다.');
    }

    return post;
  } catch (error) {
    if (
      error instanceof ChatUpdateError ||
      error instanceof ChatValidationError
    ) {
      throw error;
    }

    throw new ChatUpdateError(
      'post',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

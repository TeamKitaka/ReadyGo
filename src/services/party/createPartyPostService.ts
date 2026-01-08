import * as partyPostsRepository from '@/repositories/partyPosts.repository';
import {
  ChatCreateError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';
import type {
  PartyPost,
  CreatePartyPostInput,
} from '@/repositories/partyPosts.repository';

/**
 * 파티 게시물 생성 Service
 *
 * 책임:
 * - 입력 검증 (모든 필수 필드)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 * - Domain 로직
 */
export const createPartyPostService = async (
  input: CreatePartyPostInput
): Promise<PartyPost> => {
  // 입력 검증
  if (
    !input.creator_id ||
    typeof input.creator_id !== 'string' ||
    !input.creator_id.trim()
  ) {
    throw new ChatValidationError(
      'creator_id는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (
    !input.game_title ||
    typeof input.game_title !== 'string' ||
    !input.game_title.trim()
  ) {
    throw new ChatValidationError(
      'game_title은 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (
    !input.party_title ||
    typeof input.party_title !== 'string' ||
    !input.party_title.trim()
  ) {
    throw new ChatValidationError(
      'party_title은 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (
    !input.start_date ||
    typeof input.start_date !== 'string' ||
    !input.start_date.trim()
  ) {
    throw new ChatValidationError(
      'start_date는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (
    !input.start_time ||
    typeof input.start_time !== 'string' ||
    !input.start_time.trim()
  ) {
    throw new ChatValidationError(
      'start_time은 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (
    !input.description ||
    typeof input.description !== 'string' ||
    !input.description.trim()
  ) {
    throw new ChatValidationError(
      'description은 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (
    typeof input.max_members !== 'number' ||
    isNaN(input.max_members) ||
    input.max_members <= 0
  ) {
    throw new ChatValidationError('max_members는 양수여야 합니다.');
  }

  if (
    !input.control_level ||
    typeof input.control_level !== 'string' ||
    !input.control_level.trim()
  ) {
    throw new ChatValidationError(
      'control_level은 비어있지 않은 문자열이어야 합니다.'
    );
  }

  if (
    !input.difficulty ||
    typeof input.difficulty !== 'string' ||
    !input.difficulty.trim()
  ) {
    throw new ChatValidationError(
      'difficulty는 비어있지 않은 문자열이어야 합니다.'
    );
  }

  // 문자열 필드 trim 처리
  const trimmedInput: CreatePartyPostInput = {
    ...input,
    creator_id: input.creator_id.trim(),
    game_title: input.game_title.trim(),
    party_title: input.party_title.trim(),
    start_date: input.start_date.trim(),
    start_time: input.start_time.trim(),
    description: input.description.trim(),
    control_level: input.control_level.trim(),
    difficulty: input.difficulty.trim(),
  };

  try {
    const post = await partyPostsRepository.createPartyPost(trimmedInput);

    if (!post) {
      throw new ChatCreateError('post', '파티 게시물 생성에 실패했습니다.');
    }

    return post;
  } catch (error) {
    if (
      error instanceof ChatCreateError ||
      error instanceof ChatValidationError
    ) {
      throw error;
    }

    throw new ChatCreateError(
      'post',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

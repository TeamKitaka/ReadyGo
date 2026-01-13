import { getChatRoomUserIds } from '@/repositories/chatRoomMembers.repository';
import {
  ChatFetchError,
  ChatValidationError,
} from '@/commons/errors/chat/chatErrors';

/**
 * 채팅방 멤버 ID 목록 조회 Service
 *
 * 책임:
 * - 입력 검증 (roomId)
 * - Repository 에러 처리
 *
 * 비책임:
 * - 권한 체크
 */
export const getChatRoomUserIdsService = async (
  roomId: number
): Promise<string[]> => {
  // 입력 검증
  if (typeof roomId !== 'number' || isNaN(roomId) || roomId <= 0) {
    throw new ChatValidationError('roomId는 양수여야 합니다.');
  }

  try {
    const userIds = await getChatRoomUserIds(roomId);
    return userIds;
  } catch (error) {
    throw new ChatFetchError(
      'members',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

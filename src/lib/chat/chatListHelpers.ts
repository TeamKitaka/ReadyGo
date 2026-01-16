import type { ChatMessage, ChatRoom, UserProfile } from '@/types/chat';

/**
 * 간단한 debounce 함수
 */
export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

/**
 * 시간 포맷 함수 (24h 기준, 오늘은 시간, 그 외는 날짜)
 */
export const formatMessageTime = (dateString: string | null): string => {
  if (!dateString) {
    return '';
  }

  const messageDate = new Date(dateString);
  const now = new Date();
  const isToday =
    messageDate.getDate() === now.getDate() &&
    messageDate.getMonth() === now.getMonth() &&
    messageDate.getFullYear() === now.getFullYear();

  if (isToday) {
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) {
      return '방금 전';
    }
    if (diffMins < 60) {
      return `${diffMins}분 전`;
    }
    if (diffHours < 24) {
      return `${diffHours}시간 전`;
    }
  }

  const month = messageDate.getMonth() + 1;
  const day = messageDate.getDate();
  return `${month}월 ${day}일`;
};

/**
 * 메시지 내용 포맷 함수
 */
export const formatMessageContent = (
  message: ChatMessage | undefined
): string => {
  if (!message) {
    return '메시지가 없습니다';
  }

  const contentType = message.content_type;
  if (contentType === 'image') {
    return '📷 이미지';
  }
  if (contentType === 'system') {
    return message.content || '시스템 메시지';
  }
  return message.content || '메시지가 없습니다';
};

/**
 * 채팅방 이름 생성 함수
 */
export const getChatRoomName = (
  room: ChatRoom,
  otherMember?: UserProfile
): string => {
  const roomType = room.type ?? 'direct';

  if (roomType === 'group') {
    return '그룹 채팅';
  }

  // 1:1 채팅인 경우
  if (otherMember?.nickname) {
    return otherMember.nickname;
  }

  return '알 수 없음';
};

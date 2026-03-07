import type { Database } from '@/types/supabase';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

/**
 * 메시지를 created_at 기준으로 정렬하는 함수
 * @param messages 메시지 배열
 * @returns 정렬된 메시지 배열 (과거 → 최신)
 */
export const sortMessagesByCreatedAt = (
  messages: ChatMessage[]
): ChatMessage[] => {
  return [...messages].sort((a, b) => {
    const aTime = a.created_at || '';
    const bTime = b.created_at || '';
    return aTime.localeCompare(bTime);
  });
};

/**
 * 중복된 메시지를 제거하는 함수
 * @param messages 메시지 배열
 * @returns 중복 제거된 메시지 배열
 */
export const deduplicateMessages = (messages: ChatMessage[]): ChatMessage[] => {
  const seenIds = new Set<number>();
  return messages.filter((msg) => {
    if (seenIds.has(msg.id)) {
      return false;
    }
    seenIds.add(msg.id);
    return true;
  });
};

/**
 * 메시지에 읽음 상태를 적용하는 함수
 * 자신이 보낸 메시지는 항상 is_read: true로 설정
 * @param message 메시지
 * @param userId 현재 사용자 ID
 * @returns 읽음 상태가 적용된 메시지
 */
export const applyReadStatusToMessage = (
  message: ChatMessage,
  userId: string | undefined
): ChatMessage => {
  return {
    ...message,
    is_read: message.sender_id === userId ? true : (message.is_read ?? false),
  };
};

/**
 * 스크롤 컨테이너의 위치 정보를 계산하는 함수
 */
export interface ScrollPositionInfo {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  scrollableHeight: number;
  distanceFromBottom: number;
  isAtBottom: boolean; // 최하단에 있는지 여부 (50px 이내)
}

/**
 * 스크롤 컨테이너의 위치 정보를 계산
 * @param container 스크롤 컨테이너 요소
 * @returns 스크롤 위치 정보 또는 null
 */
export const calculateScrollPosition = (
  container: HTMLElement | null
): ScrollPositionInfo | null => {
  if (!container) {
    return null;
  }

  const { scrollTop, scrollHeight, clientHeight } = container;

  if (
    scrollTop === undefined ||
    scrollHeight === undefined ||
    clientHeight === undefined
  ) {
    return null;
  }

  const scrollableHeight = scrollHeight - clientHeight;
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
  const isAtBottom = scrollableHeight <= 0 || distanceFromBottom <= 50;

  return {
    scrollTop,
    scrollHeight,
    clientHeight,
    scrollableHeight,
    distanceFromBottom,
    isAtBottom,
  };
};

/**
 * 메시지 배열에서 중복을 제거하고 정렬하는 함수
 * @param messages 메시지 배열
 * @returns 중복 제거 및 정렬된 메시지 배열
 */
export const normalizeMessages = (messages: ChatMessage[]): ChatMessage[] => {
  const deduplicated = deduplicateMessages(messages);
  return sortMessagesByCreatedAt(deduplicated);
};

/**
 * 메시지 배열에 읽음 상태를 일괄 적용하는 함수
 * @param messages 메시지 배열
 * @param userId 현재 사용자 ID
 * @returns 읽음 상태가 적용된 메시지 배열
 */
export const applyReadStatusToMessages = (
  messages: ChatMessage[],
  userId: string | undefined
): ChatMessage[] => {
  return messages.map((msg) => applyReadStatusToMessage(msg, userId));
};

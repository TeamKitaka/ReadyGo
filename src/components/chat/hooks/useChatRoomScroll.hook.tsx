'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import React from 'react';
import type { FormattedMessageItem } from './useChatRoom.hook';

/**
 * Hook 파라미터 타입
 */
export interface UseChatRoomScrollProps {
  formattedMessages: FormattedMessageItem[];
  userId: string | undefined;
  isLoading: boolean;
}

/**
 * Hook 반환 타입
 */
export interface UseChatRoomScrollReturn {
  scrollToBottom: (containerRef: React.RefObject<HTMLDivElement>) => void;
  scrollToUnreadBoundary: (
    containerRef: React.RefObject<HTMLDivElement>
  ) => void;
  getUnreadBoundaryMessageId: () => number | null;
  shouldShowScrollToBottomButton: (
    containerRef: React.RefObject<HTMLDivElement>
  ) => boolean;
  isAtBottom: (containerRef: React.RefObject<HTMLDivElement>) => boolean;
  shouldScrollToBottom: boolean;
  shouldScrollToUnread: boolean;
  clearScrollTriggers: () => void;
  triggerScrollToBottom: () => void;
  triggerScrollToUnread: () => void;
}

/**
 * useChatRoomScroll Hook
 *
 * - 스크롤 관련 로직 관리
 * - 최하단 스크롤
 * - 안읽은 메시지 경계로 스크롤
 * - 플로팅 버튼 표시 여부
 */
export const useChatRoomScroll = (
  props: UseChatRoomScrollProps
): UseChatRoomScrollReturn => {
  const { formattedMessages, userId, isLoading } = props;

  // 상태 관리
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [shouldScrollToUnread, setShouldScrollToUnread] = useState(false);

  // 자동 스크롤 여부는 useChatRoom에서 관리하므로 여기서는 제거

  /**
   * 가장 오래된 안읽은 메시지 ID 찾기
   */
  const getUnreadBoundaryMessageId = useCallback((): number | null => {
    if (!userId) {
      return null;
    }

    // formattedMessages를 순회하며 isRead: false인 첫 번째 메시지 찾기
    for (const item of formattedMessages) {
      if (item.type === 'message' && item.message && !item.isOwnMessage) {
        if (item.isRead === false) {
          return item.message.id;
        }
      }
    }

    return null;
  }, [formattedMessages, userId]);

  /**
   * 최하단으로 스크롤
   */
  const scrollToBottom = useCallback(
    (containerRef: React.RefObject<HTMLDivElement>) => {
      if (!containerRef.current) {
        return;
      }

      // 게임링크 프리뷰 로드 완료 대기 후 한 번에 스크롤
      // (즉시 스크롤하면 프리뷰 로드되면서 스크롤이 흔들림)
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 800);
    },
    []
  );

  /**
   * 안읽은 메시지 경계로 스크롤
   */
  const scrollToUnreadBoundary = useCallback(
    (containerRef: React.RefObject<HTMLDivElement>) => {
      if (!containerRef.current) {
        return;
      }

      // 게임링크 프리뷰 로드 대기 후 스크롤
      setTimeout(() => {
        if (!containerRef.current) {
          return;
        }

        // 먼저 unread-divider를 찾아서 스크롤 시도
        const findAndScroll = (attempts = 0) => {
          if (!containerRef.current) {
            return;
          }

          // unread-divider 요소 찾기
        const unreadDividerElement = containerRef.current.querySelector(
          '[data-unread-divider="true"]'
        );

        if (unreadDividerElement) {
          // divider 요소로 스크롤 (약간의 여백을 두고)
          unreadDividerElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
          return;
        }

        // divider를 찾지 못하면 메시지로 fallback
        const unreadMessageId = getUnreadBoundaryMessageId();
        if (unreadMessageId) {
          const messageElement = containerRef.current.querySelector(
            `[data-message-id="${unreadMessageId}"]`
          );

          if (messageElement) {
            // 메시지 요소로 스크롤 (약간의 여백을 두고)
            messageElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
            return;
          }
        }

          // 요소를 찾지 못하면 재시도 또는 최하단으로 스크롤
          if (attempts < 10) {
            // 최대 10번까지 재시도 (DOM 렌더링 대기)
            setTimeout(() => findAndScroll(attempts + 1), 50);
          } else {
            // 여러 번 시도해도 찾지 못하면 최하단으로 스크롤
            scrollToBottom(containerRef);
          }
        };

        // requestAnimationFrame으로 시작하여 다음 프레임에 실행
        requestAnimationFrame(() => {
          findAndScroll(0);
        });
      }, 800); // 게임링크 프리뷰 로드 대기
    },
    [getUnreadBoundaryMessageId, scrollToBottom]
  );

  /**
   * 최하단 이동 버튼 표시 여부 확인
   * 스크롤이 전체 길이의 50% 이상 올라갔을 때만 표시
   * (최근 메시지가 화면에서 안 보일 때만 표시)
   */
  const shouldShowScrollToBottomButton = useCallback(
    (containerRef: React.RefObject<HTMLDivElement>): boolean => {
      if (!containerRef.current) {
        return false;
      }

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

      // 스크롤 가능한 전체 높이 계산
      const scrollableHeight = scrollHeight - clientHeight;

      // 스크롤 가능한 높이가 없으면 버튼 표시 안 함 (모든 메시지가 화면에 보임)
      if (scrollableHeight <= 0) {
        return false;
      }

      // 현재 스크롤 위치가 하단에서 얼마나 떨어져 있는지 계산
      // scrollTop + clientHeight = 현재 보이는 영역의 하단 위치
      // scrollHeight - (scrollTop + clientHeight) = 하단까지 남은 거리
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      // 하단까지의 거리가 전체 스크롤 가능한 높이의 50% 이상일 때만 버튼 표시
      // 즉, 스크롤이 전체 길이의 50% 이상 올라갔을 때만 표시
      const threshold = scrollableHeight * 0.5;
      return distanceFromBottom > threshold;
    },
    []
  );

  /**
   * 스크롤이 최하단에 있는지 확인
   * (읽음 처리용: 사용자가 최하단까지 스크롤했는지 확인)
   */
  const isAtBottom = useCallback(
    (containerRef: React.RefObject<HTMLDivElement>): boolean => {
      if (!containerRef.current) {
        return false;
      }

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

      // 스크롤 가능한 전체 높이 계산
      const scrollableHeight = scrollHeight - clientHeight;

      // 스크롤 가능한 높이가 없으면 최하단으로 간주 (모든 메시지가 화면에 보임)
      if (scrollableHeight <= 0) {
        return true;
      }

      // 현재 스크롤 위치가 하단에서 얼마나 떨어져 있는지 계산
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      // 하단까지의 거리가 50px 이하이면 최하단으로 간주 (약간의 여유 공간 허용)
      return distanceFromBottom <= 50;
    },
    []
  );

  /**
   * 스크롤 트리거 초기화
   */
  const clearScrollTriggers = useCallback(() => {
    setShouldScrollToBottom(false);
    setShouldScrollToUnread(false);
  }, []);

  /**
   * 최하단 스크롤 트리거
   */
  const triggerScrollToBottom = useCallback(() => {
    setShouldScrollToBottom(true);
  }, []);

  /**
   * 안읽은 메시지 경계 스크롤 트리거
   */
  const triggerScrollToUnread = useCallback(() => {
    setShouldScrollToUnread(true);
  }, []);

  /**
   * formattedMessages가 준비된 후 초기 스크롤 처리
   * (안읽은 메시지 경계 스크롤은 formattedMessages가 필요하므로)
   */
  const isInitialLoadRef = useRef(false);
  useEffect(() => {
    // 초기 로드가 완료되고 formattedMessages가 준비되었을 때만 실행
    if (isLoading || formattedMessages.length === 0) {
      return;
    }

    // 초기 로드 완료 후 한 번만 실행
    if (!isInitialLoadRef.current) {
      isInitialLoadRef.current = true;

      // 안읽은 메시지가 있는지 확인 (formattedMessages 기반)
      const hasUnread = formattedMessages.some(
        (item) =>
          item.type === 'message' &&
          item.message &&
          !item.isOwnMessage &&
          item.isRead === false
      );

      if (hasUnread) {
        triggerScrollToUnread();
      } else {
        triggerScrollToBottom();
      }
    }
  }, [
    isLoading,
    formattedMessages,
    triggerScrollToBottom,
    triggerScrollToUnread,
  ]);

  return {
    scrollToBottom,
    scrollToUnreadBoundary,
    getUnreadBoundaryMessageId,
    shouldShowScrollToBottomButton,
    isAtBottom,
    shouldScrollToBottom,
    shouldScrollToUnread,
    clearScrollTriggers,
    triggerScrollToBottom,
    triggerScrollToUnread,
  };
};

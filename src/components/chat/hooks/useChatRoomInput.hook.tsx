'use client';

import { useState, useCallback, useRef } from 'react';
import { useModal } from '@/commons/providers/modal/modal.provider';

/**
 * Hook 파라미터 타입
 */
export interface UseChatRoomInputProps {
  sendMessage: (content: string, contentType?: string) => Promise<void>;
  isBlocked: boolean;
  otherMemberNickname?: string;
}

/**
 * Hook 반환 타입
 */
export interface UseChatRoomInputReturn {
  messageInput: string;
  setMessageInput: (value: string) => void;
  handleSendMessage: () => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleGameStart: () => void;
}

/**
 * 채팅방 입력 관련 로직을 관리하는 Hook
 *
 * - 메시지 입력 상태 관리
 * - 메시지 전송 처리
 * - Enter 키 입력 처리
 * - 게임시작 모달 처리
 */
export const useChatRoomInput = (
  props: UseChatRoomInputProps
): UseChatRoomInputReturn => {
  const { sendMessage, isBlocked, otherMemberNickname } = props;
  const { openModal } = useModal();

  // 메시지 입력 상태
  const [messageInput, setMessageInput] = useState('');
  const isSendingRef = useRef(false); // 전송 중 상태 (중복 전송 방지)

  // 메시지 전송 핸들러
  const handleSendMessage = useCallback(async () => {
    // 중복 전송 방지
    if (isSendingRef.current) {
      return;
    }

    if (!messageInput.trim() || isBlocked) {
      return;
    }

    // 전송 시작
    isSendingRef.current = true;

    try {
      await sendMessage(messageInput.trim(), 'text');
      setMessageInput(''); // 전송 성공 시 입력 초기화
    } catch (err) {
      console.error('Failed to send message:', err);
      // 에러 발생 시 messageInput은 그대로 유지하여 재전송 가능
    } finally {
      // 전송 완료
      isSendingRef.current = false;
    }
  }, [messageInput, isBlocked, sendMessage]);

  // Enter 키 입력 시 전송
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // 게임시작 버튼 클릭 핸들러
  const handleGameStart = useCallback(() => {
    if (!otherMemberNickname) {
      return;
    }

    openModal({
      variant: 'dual',
      title: '게임 시작',
      description: `${otherMemberNickname}님과 게임을 시작하시겠습니까?`,
      confirmText: '확인',
      cancelText: '취소',
      onConfirm: () => {
        // 확인 버튼 클릭 시 모달만 닫기 (페이지 이동 없음)
      },
      onCancel: () => {
        // 취소 버튼 클릭 시 모달만 닫기 (페이지 이동 없음)
      },
    });
  }, [otherMemberNickname, openModal]);

  return {
    messageInput,
    setMessageInput,
    handleSendMessage,
    handleKeyDown,
    handleGameStart,
  };
};

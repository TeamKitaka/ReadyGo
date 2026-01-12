'use client';

import { useState, useCallback, useRef } from 'react';
import { useGameSelectModal } from '@/hooks/useGameSelectModal';
import type { SteamGame } from '@/hooks/useGameSelectModal';

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
  // 게임 선택 모달 관련
  gameSelectModal: {
    isOpen: boolean;
    closeModal: () => void;
    games: SteamGame[];
    filteredGames: SteamGame[];
    isLoading: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedGame: SteamGame | null;
    onSelectGame: (game: SteamGame) => void;
    onConfirm: (game: SteamGame) => void;
    error: string | null;
  };
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

  // 게임 선택 모달 상태 관리
  const gameSelectModalHook = useGameSelectModal();

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
    if (!otherMemberNickname || isBlocked) {
      return;
    }

    gameSelectModalHook.openModal();
  }, [otherMemberNickname, isBlocked, gameSelectModalHook]);

  // 게임 선택 확인 핸들러
  const handleGameConfirm = useCallback(
    async (game: SteamGame) => {
      if (isBlocked) {
        return;
      }

      try {
        const gameLink = `steam://run/${game.app_id}`;
        await sendMessage(gameLink, 'game_link');
        gameSelectModalHook.closeModal();
      } catch (err) {
        console.error('Failed to send game link message:', err);
        // 에러 발생 시에도 모달은 닫지 않음 (재시도 가능하도록)
      }
    },
    [isBlocked, sendMessage, gameSelectModalHook]
  );

  return {
    messageInput,
    setMessageInput,
    handleSendMessage,
    handleKeyDown,
    handleGameStart,
    gameSelectModal: {
      isOpen: gameSelectModalHook.isOpen,
      closeModal: gameSelectModalHook.closeModal,
      games: gameSelectModalHook.gameList,
      filteredGames: gameSelectModalHook.filteredGames,
      isLoading: gameSelectModalHook.isLoadingGames,
      searchQuery: gameSelectModalHook.searchQuery,
      onSearchChange: gameSelectModalHook.setSearchQuery,
      selectedGame: gameSelectModalHook.selectedGame,
      onSelectGame: gameSelectModalHook.selectGame,
      onConfirm: handleGameConfirm,
      error: gameSelectModalHook.error,
    },
  };
};

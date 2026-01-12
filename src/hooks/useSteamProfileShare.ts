'use client';

import { useCallback } from 'react';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import { useModal } from '@/commons/providers/modal';

/**
 * Hook 파라미터 타입
 */
export interface UseSteamProfileShareProps {
  sendMessage: (content: string, contentType?: string) => Promise<void>;
  isBlocked?: boolean;
}

/**
 * 스팀 프로필 공유 Hook
 *
 * 책임:
 * - 현재 사용자의 steam_id 조회
 * - Steam 프로필 URL 생성 및 메시지 전송
 * - steam_id가 없는 경우 에러 모달 표시
 */
export const useSteamProfileShare = (props: UseSteamProfileShareProps) => {
  const { sendMessage, isBlocked = false } = props;
  const { user } = useAuth();
  const { openModal, closeAllModals } = useModal();

  /**
   * 스팀 프로필 공유 핸들러
   */
  const handleShareSteamProfile = useCallback(async () => {
    if (isBlocked || !user?.id) {
      return;
    }

    try {
      // 1. 현재 사용자의 steam_id 조회
      const response = await fetch('/api/profile/steam-id', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch steam_id: ${response.status}`);
      }

      const data = await response.json();

      // 2. steam_id 확인
      if (!data.steam_id || data.steam_id.trim() === '') {
        // steam_id가 없는 경우 에러 모달 표시
        openModal({
          variant: 'single',
          title: '스팀 연동 필요',
          description: 'Steam 계정이 연동되어 있지 않습니다.',
          confirmText: '확인',
          onConfirm: () => {
            closeAllModals();
          },
        });
        return;
      }

      // 3. Steam 프로필 URL 생성
      const steamProfileUrl = `https://steamcommunity.com/profiles/${data.steam_id}/`;

      // 4. 메시지 전송
      await sendMessage(steamProfileUrl, 'profile_link');
    } catch (error) {
      console.error('Failed to share Steam profile:', error);
      // 에러 발생 시에도 모달 표시
      openModal({
        variant: 'single',
        title: '오류',
        description:
          error instanceof Error
            ? error.message
            : 'Steam 프로필 공유에 실패했습니다.',
        confirmText: '확인',
        onConfirm: () => {
          closeAllModals();
        },
      });
    }
  }, [user?.id, isBlocked, sendMessage, openModal, closeAllModals]);

  return {
    handleShareSteamProfile,
  };
};

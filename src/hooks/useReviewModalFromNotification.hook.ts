'use client';

import { useState, useCallback } from 'react';
import type { NotificationWithActor } from '@/hooks/useNotifications';
import { useReviewSubmission } from '@/hooks/useReviewSubmission.hook';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import type { AnimalType } from '@/commons/constants/animal';

export interface TargetUserForReview {
  id: string;
  nickname: string;
  avatar?: string;
  animalType?: AnimalType;
}

export interface UseReviewModalFromNotificationReturn {
  isModalOpen: boolean;
  targetUser: TargetUserForReview | null;
  openModal: (notification: NotificationWithActor) => Promise<void>;
  closeModal: () => void;
  isLoading: boolean;
  error: string | null;
  handleReviewSubmit: (answers: {
    manner: [boolean, boolean];
    teamwork: [boolean];
    communication: [boolean, boolean];
    comment?: string;
  }) => Promise<void>;
}

/**
 * 알림 클릭 시 후기 모달을 여는 Hook
 *
 * 책임:
 * - 알림의 actor_id를 사용하여 대상 유저 정보 조회
 * - 모달 열기/닫기 상태 관리
 * - ReviewModal에 필요한 props 제공
 * - useReviewSubmission hook과 연동하여 후기 제출 처리
 *
 * 사용처:
 * - 알림 컴포넌트에서 REVIEW_REQUESTED 타입 알림 클릭 시
 */
export const useReviewModalFromNotification =
  (): UseReviewModalFromNotificationReturn => {
    const { user } = useAuth();
    const reviewSubmission = useReviewSubmission();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [targetUser, setTargetUser] = useState<TargetUserForReview | null>(
      null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * 알림의 actor_profile에서 유저 정보 추출
     * actor_profile이 없으면 API를 통해 조회
     */
    const fetchUserProfile = useCallback(
      async (
        actorId: string | null | undefined
      ): Promise<TargetUserForReview> => {
        if (!actorId) {
          throw new Error('알림에 대상 유저 정보가 없습니다.');
        }

        try {
          const response = await fetch(`/api/profile/${actorId}`, {
            method: 'GET',
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`프로필 조회 실패: ${response.status}`);
          }

          const profile = await response.json();

          return {
            id: actorId,
            nickname: profile.nickname || '알 수 없음',
            avatar: profile.avatar_url ?? undefined,
            animalType: profile.animal_type as AnimalType | undefined,
          };
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : '프로필 조회에 실패했습니다.';
          throw new Error(errorMessage);
        }
      },
      []
    );

    /**
     * 알림 클릭 시 모달 열기
     * 알림의 actor_id를 사용하여 대상 유저 정보 조회 후 모달 열기
     */
    const openModal = useCallback(
      async (notification: NotificationWithActor) => {
        // REVIEW_REQUESTED 타입이 아니면 무시
        if (notification.type !== 'REVIEW_REQUESTED') {
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          // actor_profile이 있으면 우선 사용, 없으면 API 호출
          let userProfile: TargetUserForReview;

          if (notification.actor_profile && notification.actor_id) {
            // actor_profile에서 정보 추출
            userProfile = {
              id: notification.actor_id,
              nickname: notification.actor_profile.nickname || '알 수 없음',
              avatar: notification.actor_profile.avatar_url ?? undefined,
              animalType: notification.actor_profile.animal_type as
                | AnimalType
                | undefined,
            };
          } else {
            // API를 통해 프로필 조회
            userProfile = await fetchUserProfile(notification.actor_id);
          }

          setTargetUser(userProfile);
          setIsModalOpen(true);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : '프로필 조회에 실패했습니다.';
          setError(errorMessage);
          console.error(
            '[useReviewModalFromNotification] Failed to open modal:',
            err
          );
        } finally {
          setIsLoading(false);
        }
      },
      [fetchUserProfile]
    );

    /**
     * 모달 닫기
     */
    const closeModal = useCallback(() => {
      setIsModalOpen(false);
      setTargetUser(null);
      setError(null);
    }, []);

    /**
     * 후기 제출 핸들러
     */
    const handleReviewSubmit = useCallback(
      async (answers: {
        manner: [boolean, boolean];
        teamwork: [boolean];
        communication: [boolean, boolean];
        comment?: string;
      }) => {
        if (!targetUser || !user?.id) {
          return;
        }

        try {
          await reviewSubmission.submitReview(user.id, targetUser.id, answers);
          closeModal();
        } catch (err) {
          console.error(
            '[useReviewModalFromNotification] Failed to submit review:',
            err
          );
          throw err;
        }
      },
      [targetUser, user?.id, reviewSubmission, closeModal]
    );

    return {
      isModalOpen,
      targetUser,
      openModal,
      closeModal,
      isLoading,
      error,
      handleReviewSubmit,
    };
  };

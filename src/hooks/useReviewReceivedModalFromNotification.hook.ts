'use client';

import { useState, useCallback } from 'react';
import type { NotificationWithActor } from '@/hooks/useNotifications';

export interface ReviewData {
  id: number;
  comment: string | null;
  score_manner: number;
  score_teamwork: number;
  score_communication: number;
  created_at: string;
}

export interface ReviewerProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  animal_type: string | null;
}

export interface UseReviewReceivedModalReturn {
  isModalOpen: boolean;
  reviewData: ReviewData | null;
  reviewerProfile: ReviewerProfile | null;
  openModal: (notification: NotificationWithActor) => Promise<void>;
  closeModal: () => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * 알림 클릭 시 후기 수신 모달을 여는 Hook
 *
 * 책임:
 * - 알림의 entity_id를 사용하여 후기 데이터 조회
 * - 알림의 actor_id를 사용하여 후기를 보낸 유저 정보 조회
 * - 모달 열기/닫기 상태 관리
 * - ReviewReceived 컴포넌트에 필요한 props 제공
 *
 * 사용처:
 * - 알림 컴포넌트에서 REVIEW_RECEIVED 타입 알림 클릭 시
 */
export const useReviewReceivedModalFromNotification =
  (): UseReviewReceivedModalReturn => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reviewData, setReviewData] = useState<ReviewData | null>(null);
    const [reviewerProfile, setReviewerProfile] =
      useState<ReviewerProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * 알림의 entity_id를 사용하여 후기 데이터 조회
     */
    const fetchReview = useCallback(
      async (reviewId: string | null | undefined): Promise<ReviewData> => {
        if (!reviewId) {
          throw new Error('알림에 후기 ID가 없습니다.');
        }

        const reviewIdNum = parseInt(reviewId, 10);
        if (isNaN(reviewIdNum) || reviewIdNum <= 0) {
          throw new Error('유효하지 않은 후기 ID입니다.');
        }

        try {
          const response = await fetch(`/api/reviews/${reviewIdNum}`, {
            method: 'GET',
            credentials: 'include',
          });

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('후기를 찾을 수 없습니다.');
            }
            if (response.status === 403) {
              throw new Error('이 후기를 조회할 권한이 없습니다.');
            }
            throw new Error(`후기 조회 실패: ${response.status}`);
          }

          const review = await response.json();

          return {
            id: review.id,
            comment: review.comment,
            score_manner: review.score_manner,
            score_teamwork: review.score_teamwork,
            score_communication: review.score_communication,
            created_at: review.created_at,
          };
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : '후기 조회에 실패했습니다.';
          throw new Error(errorMessage);
        }
      },
      []
    );

    /**
     * 알림의 actor_profile에서 유저 정보 추출
     * actor_profile이 없으면 API를 통해 조회
     */
    const fetchReviewerProfile = useCallback(
      async (actorId: string | null | undefined): Promise<ReviewerProfile> => {
        if (!actorId) {
          throw new Error('알림에 후기를 보낸 유저 정보가 없습니다.');
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
            avatar_url: profile.avatar_url ?? null,
            animal_type: profile.animal_type ?? null,
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
     * 알림의 entity_id를 사용하여 후기 데이터 조회 후 모달 열기
     */
    const openModal = useCallback(
      async (notification: NotificationWithActor) => {
        // REVIEW_RECEIVED 타입이 아니면 무시
        if (notification.type !== 'REVIEW_RECEIVED') {
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          // 1. 후기 데이터 조회
          const review: ReviewData = await fetchReview(notification.entity_id);

          // 2. 후기를 보낸 유저 프로필 조회
          let profile: ReviewerProfile;

          if (notification.actor_profile && notification.actor_id) {
            // actor_profile이 있으면 우선 사용
            profile = {
              id: notification.actor_id,
              nickname: notification.actor_profile.nickname || '알 수 없음',
              avatar_url: notification.actor_profile.avatar_url ?? null,
              animal_type: notification.actor_profile.animal_type ?? null,
            };
          } else {
            // API를 통해 프로필 조회
            profile = await fetchReviewerProfile(notification.actor_id);
          }

          setReviewData(review);
          setReviewerProfile(profile);
          setIsModalOpen(true);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : '데이터 조회에 실패했습니다.';
          setError(errorMessage);
          console.error(
            '[useReviewReceivedModalFromNotification] Failed to open modal:',
            err
          );
        } finally {
          setIsLoading(false);
        }
      },
      [fetchReview, fetchReviewerProfile]
    );

    /**
     * 모달 닫기
     */
    const closeModal = useCallback(() => {
      setIsModalOpen(false);
      setReviewData(null);
      setReviewerProfile(null);
      setError(null);
    }, []);

    return {
      isModalOpen,
      reviewData,
      reviewerProfile,
      openModal,
      closeModal,
      isLoading,
      error,
    };
  };

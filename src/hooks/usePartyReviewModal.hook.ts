'use client';

import { useState, useCallback } from 'react';
import { useReviewSubmission } from '@/hooks/useReviewSubmission.hook';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import type { ReviewAnswers } from '@/services/temperature/calculateTemperatureFromReview.service';
import type { AnimalType } from '@/commons/constants/animal';

export interface ReviewRequestWithProfile {
  id: number;
  reviewer_id: string; // 후기를 쓰는 사람 (나)
  target_id: string; // 후기를 받는 사람
  status: 'pending' | 'completed';
  created_at: string;
  completed_at: string | null;
  target_user: {
    id: string;
    nickname: string;
    avatar_url: string | null;
    animal_type: string | null;
  } | null;
}

export interface PartyInfo {
  id: number;
  party_title: string;
  game_title: string;
  description: string;
  max_members: number;
  start_at: string;
  start_date: string;
  start_time: string;
  difficulty: string;
  control_level: string;
  voice_chat: string | null;
  tags: unknown;
  creator_id: string;
}

export interface PartyMemberInfo {
  user_id: string;
  role: string | null;
}

export interface UsePartyReviewModalReturn {
  isOpen: boolean;
  reviewRequests: ReviewRequestWithProfile[];
  selectedTargetId: string | null;
  isSubmitting: boolean;
  isLoading: boolean;
  error: string | null;
  partyInfo: PartyInfo | null;
  partyMembers: PartyMemberInfo[];
  openModal: (
    partyId: number,
    highlightReviewRequestId?: number
  ) => Promise<void>;
  closeModal: () => void;
  selectMember: (targetId: string) => void;
  handleReviewSubmit: (answers: ReviewAnswers) => Promise<void>;
  refreshReviewRequests: () => Promise<void>;
  backToMemberList: () => void;
  highlightReviewRequestId: number | undefined;
}

/**
 * 파티 후기 작성 모달 Hook
 *
 * 책임:
 * - 파티 후기 작성 모달의 상태 관리 및 로직
 * - 파티 정보 및 review_requests 조회
 * - 멤버 선택 및 후기 제출 처리
 * - 모달 스택 관리 (1단 ↔ 2단)
 *
 * 사용처:
 * - LayoutOverlays에서 파티 후기 요청 알림 클릭 시
 */
export const usePartyReviewModal = (): UsePartyReviewModalReturn => {
  const { user } = useAuth();
  const reviewSubmission = useReviewSubmission();
  const [isOpen, setIsOpen] = useState(false);
  const [reviewRequests, setReviewRequests] = useState<
    ReviewRequestWithProfile[]
  >([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(null);
  const [partyMembers, setPartyMembers] = useState<PartyMemberInfo[]>([]);
  const [partyId, setPartyId] = useState<number | null>(null);
  const [highlightReviewRequestId, setHighlightReviewRequestId] = useState<
    number | undefined
  >(undefined);

  /**
   * review_requests 조회
   */
  const fetchReviewRequests = useCallback(
    async (contextId: number) => {
      if (!user?.id) {
        throw new Error('사용자 정보가 없습니다.');
      }

      const response = await fetch(
        `/api/reviews/requests?context_type=party&context_id=${contextId}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.detail || 'review_requests 조회에 실패했습니다.'
        );
      }

      const result = await response.json();
      return result.data as ReviewRequestWithProfile[];
    },
    [user?.id]
  );

  /**
   * 파티 정보 조회
   */
  const fetchPartyInfo = useCallback(async (id: number) => {
    const response = await fetch(`/api/party/${id}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || errorData.detail || '파티 정보 조회에 실패했습니다.'
      );
    }

    const result = await response.json();
    return result.data as PartyInfo;
  }, []);

  /**
   * 파티 멤버 조회
   */
  const fetchPartyMembers = useCallback(async (id: number) => {
    const response = await fetch(`/api/party/${id}/members`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || errorData.detail || '파티 멤버 조회에 실패했습니다.'
      );
    }

    const result = await response.json();
    return (result.members || []).map((member: { user_id: string; role: string | null }) => ({
      user_id: member.user_id,
      role: member.role,
    })) as PartyMemberInfo[];
  }, []);

  /**
   * review_requests 목록 갱신
   */
  const refreshReviewRequests = useCallback(async () => {
    if (!partyId) {
      return;
    }

    try {
      const requests = await fetchReviewRequests(partyId);
      setReviewRequests(requests);
    } catch (err) {
      console.error(
        '[usePartyReviewModal] Failed to refresh review requests:',
        err
      );
    }
  }, [partyId, fetchReviewRequests]);

  /**
   * 모달 열기 및 데이터 로딩
   */
  const openModal = useCallback(
    async (id: number, highlightId?: number) => {
      setIsLoading(true);
      setError(null);
      setPartyId(id);
      setHighlightReviewRequestId(highlightId);

      try {
        // 파티 정보, 파티 멤버, review_requests 병렬 조회
        const [party, members, requests] = await Promise.all([
          fetchPartyInfo(id),
          fetchPartyMembers(id),
          fetchReviewRequests(id),
        ]);

        setPartyInfo(party);
        setPartyMembers(members);
        setReviewRequests(requests);
        setSelectedTargetId(null);
        setIsOpen(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : '데이터 로딩에 실패했습니다.';
        setError(errorMessage);
        console.error('[usePartyReviewModal] Failed to open modal:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchPartyInfo, fetchPartyMembers, fetchReviewRequests]
  );

  /**
   * 모달 닫기 (전체 플로우 종료)
   */
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setReviewRequests([]);
    setSelectedTargetId(null);
    setError(null);
    setPartyInfo(null);
    setPartyMembers([]);
    setPartyId(null);
    setHighlightReviewRequestId(undefined);
  }, []);

  /**
   * 멤버 선택 (2단 모달 열기)
   */
  const selectMember = useCallback((targetId: string) => {
    // 이미 completed된 멤버는 선택 불가
    const reviewRequest = reviewRequests.find(
      (req) => req.target_id === targetId
    );
    if (reviewRequest?.status === 'completed') {
      return;
    }

    setSelectedTargetId(targetId);
  }, [reviewRequests]);

  /**
   * 2단 모달에서 1단으로 복귀
   */
  const backToMemberList = useCallback(() => {
    setSelectedTargetId(null);
  }, []);

  /**
   * 후기 제출 핸들러
   */
  const handleReviewSubmit = useCallback(
    async (answers: ReviewAnswers) => {
      if (!selectedTargetId || !user?.id) {
        return;
      }

      // 해당 review_request 찾기
      const reviewRequest = reviewRequests.find(
        (req) => req.target_id === selectedTargetId && req.status === 'pending'
      );

      if (!reviewRequest) {
        throw new Error('후기 요청을 찾을 수 없습니다.');
      }

      try {
        // reviewRequestId를 포함하여 제출
        await reviewSubmission.submitReview(
          user.id,
          selectedTargetId,
          answers,
          reviewRequest.id
        );

        // 성공 시 해당 review_request의 status를 'completed'로 업데이트
        setReviewRequests((prev) =>
          prev.map((req) =>
            req.id === reviewRequest.id
              ? { ...req, status: 'completed' as const }
              : req
          )
        );

        // 1단으로 복귀
        setSelectedTargetId(null);
      } catch (err) {
        console.error(
          '[usePartyReviewModal] Failed to submit review:',
          err
        );
        throw err;
      }
    },
    [selectedTargetId, user?.id, reviewRequests, reviewSubmission]
  );

  return {
    isOpen,
    reviewRequests,
    selectedTargetId,
    isSubmitting: reviewSubmission.isSubmitting,
    isLoading,
    error,
    partyInfo,
    partyMembers,
    openModal,
    closeModal,
    selectMember,
    handleReviewSubmit,
    refreshReviewRequests,
    backToMemberList,
    highlightReviewRequestId,
  };
};


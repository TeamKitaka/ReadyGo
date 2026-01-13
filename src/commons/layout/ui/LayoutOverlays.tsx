'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OverlayContainer from '@/commons/components/overlay';
import Notifications from '@/components/overlay/notifications/ui';
import { convertToNotificationItem } from '@/components/overlay/notifications/ui';
import { FriendsContainer } from '@/components/overlay/friends';
import { useNotifications } from '@/hooks/useNotifications';
import { useOverlayStore } from '@/stores/overlay.store';
import { getChatRoomUrl, getPartyDetailUrl } from '@/commons/constants/url';
import { useReviewModalFromNotification } from '@/hooks/useReviewModalFromNotification.hook';
import ReviewModal from '@/commons/components/review-modal';
import { useReviewReceivedModalFromNotification } from '@/hooks/useReviewReceivedModalFromNotification.hook';
import ReviewReceived from '@/components/review-received';
import ModalContainer from '@/commons/components/modal-container';
import { usePartyReviewModal } from '@/hooks/usePartyReviewModal.hook';
import { PartyReviewModal } from '@/components/party-review-modal';

interface LayoutOverlaysProps {
  currentOverlay: string | null;
  onClose: () => void;
}

export const LayoutOverlays = ({
  currentOverlay,
  onClose,
}: LayoutOverlaysProps) => {
  const router = useRouter();
  const { openFriends } = useOverlayStore();
  const { notifications, loading, markAsRead } = useNotifications();
  const reviewModal = useReviewModalFromNotification();
  const reviewReceivedModal = useReviewReceivedModalFromNotification();
  const partyReviewModal = usePartyReviewModal();
  const [friendsInitialTab, setFriendsInitialTab] = useState<
    'list' | 'request'
  >('list');
  const [shouldResetFriendsTab, setShouldResetFriendsTab] = useState(false);

  // friends overlay가 닫혔다가 다시 열릴 때 초기 탭 리셋
  useEffect(() => {
    if (currentOverlay === 'friends') {
      if (shouldResetFriendsTab) {
        setFriendsInitialTab('list');
        setShouldResetFriendsTab(false);
      }
    } else if (
      currentOverlay !== 'friends' &&
      friendsInitialTab === 'request'
    ) {
      // friends overlay가 닫히면 다음에 열릴 때 리셋하도록 플래그 설정
      setShouldResetFriendsTab(true);
    }
  }, [currentOverlay, friendsInitialTab, shouldResetFriendsTab]);

  const handleNotificationClick = (notification: {
    id: string;
    type: string;
    entityType?: string;
    entityId?: string;
    onClick?: () => void;
  }) => {
    // 알림 읽음 처리
    markAsRead(Number(notification.id));

    // 친구 요청 알림: friends overlay를 열고 친구 요청 탭 활성화
    if (notification.type === 'FRIEND_REQUESTED') {
      setFriendsInitialTab('request');
      setShouldResetFriendsTab(false); // 알림에서 온 경우 리셋하지 않음
      // openFriends()를 호출하면 currentOverlay가 'friends'로 변경되므로
      // notifications overlay는 자동으로 닫히고 friends overlay가 열림
      openFriends();
      return;
    }

    // 친구 수락 알림: friends overlay를 열고 친구 목록 탭 활성화
    if (notification.type === 'FRIEND_ACCEPTED') {
      setFriendsInitialTab('list');
      setShouldResetFriendsTab(false); // 알림에서 온 경우 리셋하지 않음
      openFriends();
      return;
    }

    // 게임 시작 알림: chat_room 또는 party_post로 이동
    if (notification.type === 'GAME_STARTED') {
      if (notification.entityType === 'chat_room' && notification.entityId) {
        // entity_id 형식: "room_id:message_id" 또는 "room_id" (하위 호환)
        // room_id 추출 (콜론 앞부분)
        const [roomId] = notification.entityId.split(':');
        router.push(getChatRoomUrl(roomId));
        onClose(); // 알림 overlay 닫기
        return;
      } else if (
        notification.entityType === 'party_post' &&
        notification.entityId
      ) {
        // entity_id 형식: "post_id:message_id" 또는 "post_id" (하위 호환)
        // post_id 추출 (콜론 앞부분)
        const [postId] = notification.entityId.split(':');
        router.push(getPartyDetailUrl(postId));
        onClose(); // 알림 overlay 닫기
        return;
      }
    }

    // 후기 요청 알림: 후기 작성 모달 열기 (알림 overlay는 유지)
    if (notification.type === 'REVIEW_REQUESTED') {
      // notifications 배열에서 원본 NotificationWithActor 찾기
      const originalNotification = notifications.find(
        (n) => String(n.id) === notification.id
      );
      if (originalNotification) {
        // entity_type으로 파티/채팅 분기
        // 메시지도 확인 (하위 호환성: "함께한 파티원들과의 게임은 어떠셨나요?"이면 파티)
        const isPartyNotification =
          originalNotification.entity_type === 'party_post' ||
          originalNotification.message ===
            '함께한 파티원들과의 게임은 어떠셨나요?';


        if (isPartyNotification) {
          // 파티 후기 모달 열기
          // entity_id는 review_request.id이므로, 이를 사용해서 review_request 조회 후 context_id 얻기
          if (originalNotification.entity_id) {
            const reviewRequestId = parseInt(
              originalNotification.entity_id,
              10
            );
            if (!isNaN(reviewRequestId)) {
              // review_request 조회하여 context_id 얻기 (비동기 처리)
              fetch(
                `/api/reviews/requests?review_request_id=${reviewRequestId}`,
                {
                  method: 'GET',
                  credentials: 'include',
                }
              )
                .then((res) => {
                  if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                  }
                  return res.json();
                })
                .then((data) => {
                  if (data.data && data.data.context_type === 'party') {
                    const partyId = data.data.context_id;
                    partyReviewModal.openModal(partyId, reviewRequestId);
                  } else {
                    console.error(
                      '[LayoutOverlays] Invalid review_request data or not party context:',
                      data
                    );
                  }
                })
                .catch((err) => {
                  console.error(
                    '[LayoutOverlays] Failed to fetch review request:',
                    err
                  );
                  // 에러 발생 시에도 사용자에게 알림 (선택적)
                });
              // 비동기 처리 중이므로 여기서 return하지 않음
              // 하지만 파티 후기 모달을 열어야 하므로, 다른 로직으로 넘어가지 않도록 return
              return;
            } else {
              console.error(
                '[LayoutOverlays] Invalid review_request_id:',
                originalNotification.entity_id
              );
            }
          } else {
            console.error('[LayoutOverlays] No entity_id in notification');
          }
          // entity_id가 없거나 파싱 실패 시에도 return (일반 후기 모달로 넘어가지 않도록)
          return;
        } else if (originalNotification.entity_type === 'chat_room') {
          // 채팅 후기 모달 열기 (기존 로직)
          reviewModal.openModal(originalNotification);
        } else {
          // 기본: 채팅 후기 모달 열기
          reviewModal.openModal(originalNotification);
        }
        // 알림 overlay는 유지 (onClose 호출하지 않음)
        return;
      }
    }

    // 후기 수신 알림: 후기 수신 모달 열기 (알림 overlay는 유지)
    if (notification.type === 'REVIEW_RECEIVED') {
      // notifications 배열에서 원본 NotificationWithActor 찾기
      const originalNotification = notifications.find(
        (n) => String(n.id) === notification.id
      );
      if (originalNotification) {
        reviewReceivedModal.openModal(originalNotification);
        // 알림 overlay는 유지 (onClose 호출하지 않음)
        return;
      }
    }

    if (notification.onClick) {
      notification.onClick();
    }
  };

  const handleMarkAllAsRead = () => {
    // is_read가 false인 알림만 읽음 처리
    markAsRead();
  };

  // ReviewModal은 Portal을 사용하므로 모든 조건에서 렌더링 가능
  const reviewModalComponent = reviewModal.targetUser ? (
    <ReviewModal
      isOpen={reviewModal.isModalOpen}
      onClose={reviewModal.closeModal}
      onSubmit={reviewModal.handleReviewSubmit}
      targetUserNickname={reviewModal.targetUser.nickname}
      targetUserAvatar={reviewModal.targetUser.avatar}
      targetUserAnimalType={reviewModal.targetUser.animalType}
    />
  ) : null;

  // PartyReviewModal (1단 모달)
  const partyReviewModalComponent = partyReviewModal.isOpen ? (
    <PartyReviewModal
      isOpen={partyReviewModal.isOpen}
      onClose={partyReviewModal.closeModal}
      partyInfo={partyReviewModal.partyInfo}
      reviewRequests={partyReviewModal.reviewRequests}
      partyMembers={partyReviewModal.partyMembers}
      selectedTargetId={partyReviewModal.selectedTargetId}
      onSelectMember={partyReviewModal.selectMember}
      onBackToMemberList={partyReviewModal.backToMemberList}
      highlightReviewRequestId={partyReviewModal.highlightReviewRequestId}
      isSubmitting={partyReviewModal.isSubmitting}
    />
  ) : null;

  // ReviewModal (2단 모달 - 파티 후기 작성용)
  const partyReviewSubmitModalComponent =
    partyReviewModal.isOpen && partyReviewModal.selectedTargetId
      ? (() => {
          const selectedRequest = partyReviewModal.reviewRequests.find(
            (req) =>
              req.target_id === partyReviewModal.selectedTargetId &&
              req.status === 'pending'
          );

          if (!selectedRequest || !selectedRequest.target_user) {
            return null;
          }

          return (
            <ReviewModal
              isOpen={true}
              onClose={partyReviewModal.backToMemberList}
              onSubmit={partyReviewModal.handleReviewSubmit}
              targetUserNickname={selectedRequest.target_user.nickname}
              targetUserAvatar={
                selectedRequest.target_user.avatar_url ?? undefined
              }
              targetUserAnimalType={
                (selectedRequest.target_user.animal_type as
                  | import('@/commons/constants/animal').AnimalType
                  | undefined) ?? undefined
              }
            />
          );
        })()
      : null;

  // ReviewReceived Modal은 Portal을 사용하므로 모든 조건에서 렌더링 가능
  const reviewReceivedModalComponent = reviewReceivedModal.isModalOpen ? (
    <ModalContainer onClose={reviewReceivedModal.closeModal}>
      <ReviewReceived
        onClose={reviewReceivedModal.closeModal}
        reviewData={reviewReceivedModal.reviewData}
        reviewerProfile={reviewReceivedModal.reviewerProfile}
      />
    </ModalContainer>
  ) : null;

  if (currentOverlay === 'notifications') {
    const notificationItems = (notifications || []).map(
      convertToNotificationItem
    );

    return (
      <>
        <OverlayContainer onClose={onClose}>
          <Notifications
            notifications={notificationItems}
            loading={loading}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNotificationClick={handleNotificationClick}
          />
        </OverlayContainer>
        {reviewModalComponent}
        {partyReviewModalComponent}
        {partyReviewSubmitModalComponent}
        {reviewReceivedModalComponent}
      </>
    );
  }

  if (currentOverlay === 'friends') {
    return (
      <>
        <OverlayContainer onClose={onClose}>
          <FriendsContainer initialTab={friendsInitialTab} />
        </OverlayContainer>
        {reviewModalComponent}
        {partyReviewModalComponent}
        {partyReviewSubmitModalComponent}
        {reviewReceivedModalComponent}
      </>
    );
  }

  return (
    <>
      {reviewModalComponent}
      {partyReviewModalComponent}
      {partyReviewSubmitModalComponent}
      {reviewReceivedModalComponent}
    </>
  );
};

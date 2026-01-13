'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Icon from '@/commons/components/icon';
import { URL_PATHS } from '@/commons/constants/url';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import { useModal } from '@/commons/providers/modal/modal.provider';
import ChatNull from './ui/chat-null/chatNull';
import ChatRoom from './ui/chat-room/chatRoom';
import MemberList from './ui/member-list/memberList';
import PartyInfo from './ui/party-info/partyInfo';
import { usePartyBinding } from './hooks/index.binding.hook';
import { useLinkUpdateModal } from './hooks/index.link.update.modal.hook';
import { useDeleteParty } from './hooks/index.delete.hook';
import { useJoinParty } from './hooks/index.join.hook';
import { useLeaveParty } from './hooks/index.leave.hook';
import styles from './styles.module.css';

export default function PartyDetail() {
  const params = useParams();
  const partyId = params?.id as string | undefined;
  const { user } = useAuth();
  const { data, isLoading, error, refetch, currentUserRole } =
    usePartyBinding();

  const { openModal, closeModal } = useModal();
  const { openUpdateModal } = useLinkUpdateModal({ onRefetch: refetch });
  const { openDeleteModal } = useDeleteParty({ onRefetch: refetch });
  const { joinParty } = useJoinParty({ onRefetch: refetch });
  const { leaveParty } = useLeaveParty({ onRefetch: refetch });

  // 작성자 여부 확인
  const isCreator = data?.creator_id === user?.id;

  // 시작시간이 지났는지 확인하는 함수
  const isStartTimeExpired = (): boolean => {
    if (!data?.start_date_raw || !data?.start_time_raw) {
      return false;
    }

    try {
      // 원본 데이터 사용: start_date_raw는 "YYYY-MM-DD", start_time_raw는 "HH:mm:ss"
      const startDateTime = new Date(
        `${data.start_date_raw} ${data.start_time_raw}`
      );
      const now = new Date();

      return startDateTime < now;
    } catch (error) {
      console.error('시작 시간 파싱 오류:', error);
      return false;
    }
  };

  const isExpired = isStartTimeExpired();

  const handleJoinClick = async () => {
    if (partyId) {
      await joinParty(partyId);
      // 참여 성공 시 refetch가 자동으로 호출되어 currentUserRole이 업데이트됨
      // 멤버 목록은 Realtime을 통해 자동으로 업데이트됨
    }
  };

  const handleLeaveClick = async () => {
    if (partyId) {
      await leaveParty(partyId);
      // 나가기 성공 시 refetch가 자동으로 호출되어 currentUserRole이 업데이트됨
      // 멤버 목록은 Realtime을 통해 자동으로 업데이트됨
    }
  };

  const handleGameStart = () => {
    if (!data?.game_title) {
      openModal({
        variant: 'dual',
        title: '알림',
        description: '게임 정보가 없습니다.',
        onConfirm: () => {
          closeModal();
        },
      });
      return;
    }

    // 확인 모달 표시
    openModal({
      variant: 'dual',
      title: '게임을 시작하시겠습니까?',
      description: `${data.game_title}\n게임 링크를 채팅방에 전송합니다.`,
      onConfirm: async () => {
        try {
          // 1. game_title로 app_id 검색
          const searchUrl = `/api/party/game/search?game_title=${encodeURIComponent(data.game_title)}`;

          const searchResponse = await fetch(searchUrl);

          if (!searchResponse.ok) {
            const errorData = await searchResponse.json().catch(() => ({}));
            console.error('[게임 시작] 검색 API 에러:', errorData);
            throw new Error(
              errorData.message ||
                '게임 정보를 조회하는 중 오류가 발생했습니다.'
            );
          }

          const searchData = await searchResponse.json();

          if (!searchData.data || !searchData.data.app_id) {
            openModal({
              variant: 'dual',
              title: '알림',
              description: `"${data.game_title}" 게임 정보를 찾을 수 없습니다. 게임 제목이 정확한지 확인해주세요.`,
              onConfirm: () => {
                closeModal();
              },
            });
            return;
          }

          // 2. 게임 링크 생성
          const gameLink = `steam://run/${searchData.data.app_id}`;

          // 3. 파티 채팅방에 게임 링크 전송
          if (!partyId) {
            throw new Error('파티 ID가 없습니다.');
          }

          const messageResponse = await fetch(
            `/api/party/${partyId}/messages`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                content: gameLink,
                contentType: 'game_link',
              }),
            }
          );

          if (!messageResponse.ok) {
            const errorData = await messageResponse.json().catch(() => ({}));
            throw new Error(
              errorData.message || '게임 링크 전송에 실패했습니다.'
            );
          }

          // 성공 시 모달 닫기
          closeModal();
        } catch (error) {
          console.error('게임 시작 실패:', error);
          openModal({
            variant: 'dual',
            title: '알림',
            description:
              error instanceof Error
                ? error.message
                : '게임 링크 전송에 실패했습니다.',
            onConfirm: () => {
              closeModal();
            },
          });
        }
      },
      onCancel: () => {
        closeModal();
      },
    });
  };

  const handleEditClick = () => {
    if (isExpired) {
      openModal({
        variant: 'dual',
        title: '알림',
        description: '이미 지난 파티입니다',
        onConfirm: () => {
          closeModal();
        },
      });
      return;
    }
    openUpdateModal();
  };

  const handleDeleteClick = () => {
    if (isExpired) {
      openModal({
        variant: 'dual',
        title: '알림',
        description: '이미 지난 파티입니다',
        onConfirm: () => {
          closeModal();
        },
      });
      return;
    }
    openDeleteModal();
  };

  return (
    <div className={styles.container} data-testid="party-detail-page">
      <div className={styles.titleArea}>
        <div className={styles.titleAreaContent}>
          <Link href={URL_PATHS.PARTY} className={styles.backLink}>
            <Icon name="arrow-left" size={16} className={styles.backIcon} />
            <span className={styles.backText}>돌아가기</span>
          </Link>
          <div className={styles.titleRow}>
            <div className={styles.titleContent}>
              {isLoading ? (
                <>
                  <h1 className={styles.title}>로딩 중...</h1>
                  <p className={styles.subtitle}>데이터를 불러오는 중입니다.</p>
                </>
              ) : error ? (
                <>
                  <h1 className={styles.title}>오류 발생</h1>
                  <p
                    className={styles.subtitle}
                    data-testid="party-detail-error"
                  >
                    {error.message}
                  </p>
                </>
              ) : data ? (
                <>
                  <h1 className={styles.title} data-testid="party-detail-title">
                    {data.party_title}
                  </h1>
                  <p
                    className={styles.subtitle}
                    data-testid="party-detail-description"
                  >
                    {data.description}
                  </p>
                </>
              ) : null}
            </div>
            {isCreator && (
              <div className={styles.buttonGroup}>
                <button
                  className={styles.actionButton}
                  type="button"
                  onClick={handleEditClick}
                  data-testid="party-detail-edit-button"
                >
                  <Icon name="edit" size={20} className={styles.buttonIcon} />
                  <span className={styles.buttonText}>수정하기</span>
                </button>
                <button
                  className={styles.actionButton}
                  type="button"
                  onClick={handleDeleteClick}
                  data-testid="party-detail-delete-button"
                >
                  <Icon name="trash" size={20} className={styles.buttonIcon} />
                  <span className={styles.buttonText}>삭제하기</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={styles.mainArea}>
        {currentUserRole === 'leader' || currentUserRole === 'member' ? (
          <ChatRoom isExpired={isExpired} />
        ) : (
          <ChatNull />
        )}
        <div className={styles.sideArea}>
          <PartyInfo
            data={data}
            isLoading={isLoading}
            error={error}
            userRole={currentUserRole}
            onJoinClick={handleJoinClick}
            onLeaveClick={handleLeaveClick}
            onGameStartClick={handleGameStart}
          />
          <MemberList />
        </div>
      </div>
    </div>
  );
}

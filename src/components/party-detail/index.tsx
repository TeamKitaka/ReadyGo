'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Icon from '@/commons/components/icon';
import { URL_PATHS } from '@/commons/constants/url';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import ChatNull from './ui/chat-null/chatNull';
import ChatRoom from './ui/chat-room/chatRoom';
import MemberList from './ui/member-list/memberList';
import PartyInfo from './ui/party-info/partyInfo';
import { usePartyBinding } from './hooks/index.binding.hook';
import { useLinkUpdateModal } from './hooks/index.link.update.modal.hook';
import { useDeleteParty } from './hooks/index.delete.hook';
import { useJoinParty } from './hooks/index.join.hook';
import { useLeaveParty } from './hooks/index.leave.hook';
import { useMemberList } from './hooks/index.binding.memberList.hook';
import styles from './styles.module.css';

export default function PartyDetail() {
  const params = useParams();
  const partyId = params?.id as string | undefined;
  const { user } = useAuth();
  const { data, isLoading, error, refetch, currentUserRole } =
    usePartyBinding();

  // postId를 URL 파라미터에서 가져오고 number로 변환
  const postIdNumber =
    partyId && !isNaN(parseInt(partyId, 10)) ? parseInt(partyId, 10) : 0;

  // useMemberList Hook 호출 (refetch 함수 가져오기)
  const { refetch: refetchMemberList } = useMemberList({
    postId: postIdNumber,
  });

  // refetch를 결합한 함수 생성
  const handleRefetch = useCallback(async () => {
    await refetch();
    await refetchMemberList();
  }, [refetch, refetchMemberList]);

  const { openUpdateModal } = useLinkUpdateModal({ onRefetch: refetch });
  const { openDeleteModal } = useDeleteParty({ onRefetch: refetch });
  const { joinParty } = useJoinParty({ onRefetch: handleRefetch });
  const { leaveParty } = useLeaveParty({ onRefetch: handleRefetch });

  // 작성자 여부 확인
  const isCreator = data?.creator_id === user?.id;

  const handleJoinClick = async () => {
    if (partyId) {
      await joinParty(partyId);
      // 참여 성공 시 refetch가 자동으로 호출되어 currentUserRole이 업데이트됨
    }
  };

  const handleLeaveClick = async () => {
    if (partyId) {
      await leaveParty(partyId);
      // 나가기 성공 시 refetch가 자동으로 호출되어 currentUserRole이 업데이트됨
    }
  };

  const handleGameStart = () => {
    // 게임시작 기능은 별도로 구현할 예정 (현재는 빈 함수)
  };

  const handleEditClick = () => {
    openUpdateModal();
  };

  const handleDeleteClick = () => {
    openDeleteModal();
  };

  return (
    <div className={styles.container} data-testid="party-detail-page">
      <div className={styles.titleArea}>
        <div className={styles.titleAreaContent}>
          <Link href={URL_PATHS.PARTY} className={styles.backLink}>
            <Icon name="arrow-left" size={24} className={styles.backIcon} />
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
          <ChatRoom />
        ) : (
          <ChatNull />
        )}
        <div className={styles.sideArea}>
          <MemberList />
          <PartyInfo
            data={data}
            isLoading={isLoading}
            error={error}
            userRole={currentUserRole}
            onJoinClick={handleJoinClick}
            onLeaveClick={handleLeaveClick}
            onGameStartClick={handleGameStart}
          />
        </div>
      </div>
    </div>
  );
}

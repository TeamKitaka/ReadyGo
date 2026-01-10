'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './styles.module.css';
import Avatar from '@/commons/components/avatar';
import Icon from '@/commons/components/icon';
import Input from '@/commons/components/input';
import Button from '@/commons/components/button';
import Searchbar from '@/commons/components/searchbar';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimalType } from '@/commons/constants/animal';
import { useSideProfilePanel } from '@/hooks/useSideProfilePanel';
import { useChatRoom, useChatRoomInput } from '@/components/chat/hooks';
import { formatDateDivider } from '@/lib/chat/messageFormatter';
import { useModal } from '@/commons/providers/modal/modal.provider';
import ReviewSubmit from '@/components/review-submit/ReviewSubmit';

interface ChatRoomProps {
  roomId?: string;
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  // 사이드 프로필 패널 제어
  const { toggleProfile, openProfile, isOpen, targetUserId } =
    useSideProfilePanel();
  
  // 모달 제어
  const { openModal } = useModal();

  // roomId를 number로 변환 (NaN 처리 포함)
  const roomIdNumber = isNaN(parseInt(roomId || '', 10))
    ? 0
    : parseInt(roomId || '', 10);

  // 메시지 리스트 컨테이너 ref
  const messageListRef = useRef<HTMLDivElement>(null);

  // useChatRoom Hook 호출
  const {
    formattedMessages,
    otherMemberInfo,
    isOtherMemberInfoLoading,
    sendMessage,
    isLoading,
    error,
    isBlocked,
    scrollToBottom,
    scrollToUnreadBoundary,
    shouldScrollToBottom,
    shouldScrollToUnread,
    clearScrollTriggers,
    shouldShowScrollToBottomButton,
    markAsReadOnScroll,
    setMessageListContainerRef,
    roomCreatedAt,
  } = useChatRoom({ roomId: roomIdNumber });

  // 플로팅 버튼 표시 여부
  const [showScrollToBottomButton, setShowScrollToBottomButton] =
    useState(false);

  // 채팅 입력 관련 로직
  const {
    messageInput,
    setMessageInput,
    handleSendMessage,
    handleKeyDown,
    handleGameStart,
    timerCount,
    isTimerActive,
    setTimerEndCallback,
  } = useChatRoomInput({
    sendMessage,
    isBlocked,
    otherMemberNickname: otherMemberInfo?.nickname,
    roomId: roomIdNumber,
    otherMemberId: otherMemberInfo?.id,
  });

  // 타이머 종료 시 후기 모달 표시
  useEffect(() => {
    if (!otherMemberInfo?.id || !otherMemberInfo?.nickname) {
      return;
    }

    const handleTimerEnd = () => {
      // 후기 작성 모달 열기
      openModal({
        component: ReviewSubmit,
        componentProps: {
          targetUserId: otherMemberInfo.id,
          targetNickname: otherMemberInfo.nickname,
          onClose: () => {
            // 모달 닫기 (기본 동작)
          },
          onSuccess: () => {
            // 후기 제출 성공 시 모달 닫기
          },
        },
      });
    };

    setTimerEndCallback(handleTimerEnd);

    return () => {
      setTimerEndCallback(() => {});
    };
  }, [otherMemberInfo, openModal, setTimerEndCallback]);

  // 채팅방이 변경될 때 사이드 패널이 열려있다면 새로운 상대방의 프로필로 자동 업데이트
  useEffect(() => {
    if (
      isOpen &&
      targetUserId &&
      otherMemberInfo &&
      targetUserId !== otherMemberInfo.id
    ) {
      // 다른 사용자의 프로필이 열려있을 때만 자동으로 변경
      openProfile(otherMemberInfo.id);
    }
  }, [roomId, otherMemberInfo, isOpen, targetUserId, openProfile]);

  // 스크롤 트리거 처리
  useEffect(() => {
    if (shouldScrollToBottom && messageListRef.current) {
      scrollToBottom(messageListRef);
      clearScrollTriggers();
    } else if (shouldScrollToUnread && messageListRef.current) {
      scrollToUnreadBoundary(messageListRef);
      clearScrollTriggers();
    }
  }, [
    shouldScrollToBottom,
    shouldScrollToUnread,
    scrollToBottom,
    scrollToUnreadBoundary,
    clearScrollTriggers,
  ]);

  // 메시지 리스트 컨테이너 ref를 hook에 등록
  useEffect(() => {
    setMessageListContainerRef(messageListRef);
  }, [setMessageListContainerRef]);

  // 스크롤 위치 감지 및 읽음 처리
  const handleScroll = useCallback(() => {
    if (messageListRef.current) {
      const shouldShow = shouldShowScrollToBottomButton(messageListRef);
      setShowScrollToBottomButton(shouldShow);
      // 스크롤 기반 읽음 처리
      markAsReadOnScroll(messageListRef);
    }
  }, [shouldShowScrollToBottomButton, markAsReadOnScroll]);

  // 스크롤 이벤트 리스너 등록
  useEffect(() => {
    const container = messageListRef.current;
    if (!container) {
      return;
    }

    container.addEventListener('scroll', handleScroll);
    // 초기 상태 확인
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, formattedMessages.length]);

  // 최하단 이동 버튼 클릭 핸들러
  const handleScrollToBottomClick = useCallback(() => {
    if (messageListRef.current) {
      scrollToBottom(messageListRef);
    }
  }, [scrollToBottom]);

  // 현재 사용자의 프로필이 열려있는지 확인
  const isProfileActive =
    isOpen && otherMemberInfo && targetUserId === otherMemberInfo.id;

  // 에러 상태 처리 (에러가 있어도 UI는 유지)
  if (error) {
    console.error('ChatRoom error:', error);
  }

  // 상대방 정보 기본값
  const displayNickname = otherMemberInfo?.nickname ?? '알 수 없음';
  const displayAvatarImagePath = otherMemberInfo?.avatarImagePath ?? '';
  const displayUserStatus = otherMemberInfo?.userStatus ?? 'offline';
  const displayAnimalType = otherMemberInfo?.animalType;
  const displayOtherUserId = otherMemberInfo?.id ?? '';

  return (
    <div className={styles.container} aria-label="채팅방">
      {/* 헤더 영역 */}
      <header className={styles.header} aria-label="채팅방 헤더">
        <div className={styles.headerLeft}>
          {isOtherMemberInfoLoading ? (
            <>
              <Skeleton
                className={styles.headerAvatarSkeleton}
                style={{ width: '40px', height: '40px', borderRadius: '50%' }}
              />
              <div className={styles.headerUserInfo}>
                <Skeleton
                  className={styles.headerNicknameSkeleton}
                  style={{
                    width: '120px',
                    height: '20px',
                    marginBottom: '4px',
                  }}
                />
                <Skeleton
                  className={styles.headerStatusSkeleton}
                  style={{ width: '60px', height: '16px' }}
                />
              </div>
            </>
          ) : (
            <>
              <Avatar
                imageUrl={displayAvatarImagePath}
                animalType={displayAnimalType as AnimalType}
                alt={displayNickname}
                size="s"
                status={displayUserStatus}
                showStatus={true}
                className={styles.headerAvatar}
              />
              <div className={styles.headerUserInfo}>
                <div className={styles.headerNickname}>{displayNickname}</div>
                <div className={styles.headerStatus}>
                  {displayUserStatus === 'online' ? '온라인' : '오프라인'}
                </div>
              </div>
            </>
          )}
        </div>
        <div className={styles.headerRight}>
          <Searchbar
            placeholder="검색하기"
            aria-label="메시지 검색"
            className={styles.searchBar}
          />
          {!isOtherMemberInfoLoading && displayOtherUserId && (
            <button
              className={`${styles.menuButton} ${isProfileActive ? styles.active : ''}`}
              aria-label="사용자 메뉴"
              type="button"
              onClick={() => toggleProfile(displayOtherUserId)}
            >
              <Icon name="userprofile" size={20} />
            </button>
          )}
        </div>
      </header>

      {/* 차단 안내 배너 */}
      {isBlocked && (
        <div className={styles.blockBanner} role="alert" aria-live="polite">
          차단된 사용자입니다. 메시지를 보낼 수 없습니다.
        </div>
      )}

      {/* 메시지 리스트 영역 */}
      <div
        ref={messageListRef}
        className={styles.messageList}
        aria-label="메시지 목록"
      >
        {isLoading ? null : formattedMessages.length === 0 ? ( // 메시지 로딩 중일 때는 빈 상태로 표시 (스켈레톤 없음)
          <>
            {roomCreatedAt && (
              <div className={styles.dateDivider}>
                {formatDateDivider(roomCreatedAt)}
              </div>
            )}
            <div className={styles.unreadDivider}>
              <span className={styles.unreadDividerText}>
                메시지가 없습니다
              </span>
            </div>
          </>
        ) : (
          formattedMessages.map((item, index) => {
            if (item.type === 'date-divider') {
              return (
                <div
                  key={`divider-${index}`}
                  className={styles.dateDivider}
                  aria-label={`날짜 구분선: ${item.formattedDate || ''}`}
                >
                  {item.formattedDate || ''}
                </div>
              );
            }

            if (item.type === 'unread-divider') {
              return (
                <div
                  key={`unread-divider-${index}`}
                  data-unread-divider="true"
                  className={styles.unreadDivider}
                  aria-label="여기까지 읽었습니다"
                >
                  <span className={styles.unreadDividerText}>
                    여기까지 읽었습니다
                  </span>
                </div>
              );
            }

            // message 타입인 경우
            const {
              message,
              isGroupStart,
              isGroupEnd,
              isOwnMessage,
              formattedTime,
              formattedContent,
              isRead: _isRead,
            } = item;

            if (!message) {
              return null;
            }

            const isSystemMessage = message.content_type === 'system';

            if (isSystemMessage) {
              return (
                <div
                  key={message.id}
                  className={styles.systemMessage}
                  aria-label="시스템 메시지"
                >
                  {formattedContent}
                </div>
              );
            }

            if (isOwnMessage) {
              return (
                <div
                  key={message.id}
                  data-message-id={message.id}
                  className={styles.messageRow}
                  aria-label={`내 메시지: ${formattedContent}`}
                >
                  <div className={styles.ownMessageContainer}>
                    {isGroupEnd && (
                      <div className={styles.messageTime}>{formattedTime}</div>
                    )}
                    <div className={styles.ownMessageBubble}>
                      <span className={styles.messageContent}>
                        {formattedContent}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                data-message-id={message.id}
                className={styles.messageRow}
                aria-label={`${displayNickname}의 메시지: ${formattedContent}`}
              >
                <div
                  className={`${styles.otherMessageContainer} ${
                    !isGroupStart ? styles.consecutive : ''
                  }`}
                >
                  {isGroupStart && (
                    <Avatar
                      imageUrl={displayAvatarImagePath}
                      animalType={displayAnimalType as AnimalType}
                      alt={displayNickname}
                      size="s"
                      status={displayUserStatus}
                      showStatus={false}
                      className={styles.messageAvatar}
                    />
                  )}
                  {!isGroupStart && <div className={styles.avatarSpacer} />}
                  <div className={styles.otherMessageContent}>
                    <div className={styles.otherMessageBubble}>
                      <span className={styles.messageContent}>
                        {formattedContent}
                      </span>
                    </div>
                    {isGroupEnd && (
                      <div className={styles.messageTime}>{formattedTime}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {/* 플로팅 버튼: 최근 메시지로 이동 (메시지 리스트 하단에 고정) */}
        {showScrollToBottomButton && (
          <div className={styles.scrollToBottomButtonWrapper}>
            <button
              className={styles.scrollToBottomButton}
              onClick={handleScrollToBottomClick}
              aria-label="최근 메시지로 이동"
              type="button"
            >
              <Icon name="chevron-down" size={20} />
              <span>최근 메시지</span>
            </button>
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className={styles.inputArea} aria-label="메시지 입력 영역">
        <div className={styles.inputWrapper}>
          <Input
            variant="primary"
            size="m"
            state={isBlocked ? 'disabled' : 'Default'}
            placeholder={`@${displayNickname}님에게 메시지 보내기`}
            className={styles.messageInput}
            disabled={isBlocked}
            aria-label="메시지 입력"
            label={false}
            iconLeft={undefined}
            iconRight={messageInput.trim() ? 'send' : undefined}
            iconRightColor={
              messageInput.trim() && !isBlocked
                ? 'var(--color-icon-interactive-secondary)'
                : undefined
            }
            additionalInfo={undefined}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onIconRightClick={
              messageInput.trim() && !isBlocked ? handleSendMessage : undefined
            }
          />
        </div>
        <Button
          variant="primary"
          size="m"
          shape="rectangle"
          disabled={isBlocked || !otherMemberInfo || isTimerActive}
          aria-label={isTimerActive ? '타이머 진행 중' : '게임시작'}
          className={styles.gameStartButton}
          onClick={handleGameStart}
        >
          {isTimerActive && timerCount !== null ? (
            <>
              <Icon name="time" size={20} />
              <span className={styles.gameStartButtonText}>{timerCount}초</span>
            </>
          ) : (
            <>
              <Icon name="gamepad" size={20} />
              <span className={styles.gameStartButtonText}>게임시작</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

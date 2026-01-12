'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import styles from './styles.module.css';
import parentStyles from '../../styles.module.css';
import Avatar from '@/commons/components/avatar';
import Input from '@/commons/components/input';
import Icon from '@/commons/components/icon';
import { AnimalType } from '@/commons/constants/animal';
import { useChatRoom } from '../../hooks/index.binding.chatRoom.hook';

interface ChatRoomProps {
  isExpired?: boolean;
}

export default function ChatRoom({ isExpired = false }: ChatRoomProps) {
  const params = useParams();
  const postId = params?.id as string | undefined;

  // postId를 number로 변환 (NaN 처리 포함)
  const postIdNumber = isNaN(parseInt(postId || '', 10))
    ? 0
    : parseInt(postId || '', 10);

  // 메시지 리스트 컨테이너 ref
  const messageListRef = useRef<HTMLDivElement>(null);

  // useChatRoom Hook 호출
  const {
    formattedMessages,
    sendMessage,
    isLoading,
    error,
    isBlocked,
    scrollToBottom,
    shouldShowScrollToBottomButton,
    shouldScrollToBottom,
    clearScrollTriggers,
    setMessageListContainerRef,
  } = useChatRoom({ postId: postIdNumber });

  // 플로팅 버튼 표시 여부
  const [showScrollToBottomButton, setShowScrollToBottomButton] =
    useState(false);

  // 메시지 입력 상태 관리
  const [messageInput, setMessageInput] = useState('');

  // 메시지 전송 핸들러
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isBlocked || isExpired) {
      return;
    }

    try {
      await sendMessage(messageInput.trim());
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // 에러 발생 시에도 messageInput은 유지하여 재전송 가능하도록 처리
    }
  };

  // Enter 키 입력 핸들러
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isExpired) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 스크롤 트리거 처리
  useEffect(() => {
    if (shouldScrollToBottom && messageListRef.current) {
      scrollToBottom(messageListRef);
      clearScrollTriggers();
    }
  }, [shouldScrollToBottom, scrollToBottom, clearScrollTriggers]);

  // 메시지 리스트 컨테이너 ref를 hook에 등록
  useEffect(() => {
    setMessageListContainerRef(messageListRef);
  }, [setMessageListContainerRef]);

  // 스크롤 위치 감지
  const handleScroll = useCallback(() => {
    if (messageListRef.current) {
      const shouldShow = shouldShowScrollToBottomButton(messageListRef);
      setShowScrollToBottomButton(shouldShow);
    }
  }, [shouldShowScrollToBottomButton]);

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

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className={parentStyles.chatArea}>
        <div className={styles.messageList} aria-label="메시지 목록">
          <div className={styles.messagesContainer}>
            <div className={styles.messagesWrapper}>
              <p>로딩 중...</p>
            </div>
          </div>
        </div>
        <div className={parentStyles.messageArea} aria-label="메시지 입력 영역">
          <div className={styles.inputWrapper}>
            <Input
              variant="primary"
              size="m"
              placeholder="메세지 보내기"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="메시지 입력"
              label={false}
              iconRight="send"
              onIconRightClick={handleSendMessage}
              iconSize={20}
              disabled={true}
            />
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태 처리 (에러가 있어도 UI는 유지)
  if (error) {
    console.error('ChatRoom error:', error);
  }

  return (
    <div className={parentStyles.chatArea}>
      {/* 메시지 리스트 영역 */}
      <div
        ref={messageListRef}
        className={styles.messageList}
        aria-label="메시지 목록"
      >
        <div className={styles.messagesContainer}>
          {/* 날짜 구분선 렌더링 */}
          {formattedMessages.map((item, index) => {
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
            return null;
          })}
          {/* 메시지 렌더링 */}
          <div className={styles.messagesWrapper}>
            {formattedMessages.map((item, index) => {
              if (item.type !== 'message' || !item.message) {
                return null;
              }

              // 객체 구조 분해
              const {
                message,
                isOwnMessage,
                isConsecutive,
                formattedTime,
                formattedContent,
                senderNickname,
                senderAnimalType,
              } = item;

              // 내 메시지 렌더링
              if (isOwnMessage) {
                return (
                  <div
                    key={`message-${message.id}-${index}`}
                    className={styles.messageGroup}
                  >
                    <div
                      className={styles.messageRow}
                      aria-label={`내 메시지: ${formattedContent || ''}`}
                    >
                      <div className={styles.ownMessageContainer}>
                        <div className={styles.messageTime}>
                          {formattedTime}
                        </div>
                        <div className={styles.ownMessageBubble}>
                          <span className={styles.messageContent}>
                            {formattedContent}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // 상대방 메시지 렌더링
              return (
                <div
                  key={`message-${message.id}-${index}`}
                  className={styles.messageGroup}
                >
                  <div className={styles.messageRow}>
                    <div className={styles.otherMessageContainer}>
                      {/* 아바타 렌더링 (연속 메시지가 아닌 경우에만 표시) */}
                      {!isConsecutive && (
                        <Avatar
                          animalType={
                            senderAnimalType
                              ? (senderAnimalType as AnimalType)
                              : undefined
                          }
                          alt={senderNickname || ''}
                          size="s"
                          className={styles.messageAvatar}
                          showStatus={false}
                        />
                      )}
                      {isConsecutive && <div className={styles.avatarSpacer} />}
                      <div className={styles.otherMessageContent}>
                        {/* 발신자 닉네임 (연속 메시지가 아닌 경우에만 표시) */}
                        {!isConsecutive && (
                          <div className={styles.senderNickname}>
                            {senderNickname}
                          </div>
                        )}
                        <div className={styles.messageBubbles}>
                          <div className={styles.otherMessageWrapper}>
                            <div className={styles.otherMessageBubble}>
                              <span className={styles.messageContent}>
                                {formattedContent}
                              </span>
                            </div>
                            <div className={styles.messageTime}>
                              {formattedTime}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
      <div className={parentStyles.messageArea} aria-label="메시지 입력 영역">
        <div className={styles.inputWrapper}>
          <Input
            variant="primary"
            size="m"
            placeholder="메세지 보내기"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="메시지 입력"
            label={false}
            iconRight={messageInput.trim() ? 'send' : undefined}
            iconRightColor={
              messageInput.trim() && !isBlocked && !isExpired
                ? 'var(--color-icon-interactive-secondary)'
                : undefined
            }
            onIconRightClick={
              messageInput.trim() && !isBlocked && !isExpired
                ? handleSendMessage
                : undefined
            }
            iconSize={20}
            disabled={isBlocked || isExpired}
          />
        </div>
      </div>
    </div>
  );
}

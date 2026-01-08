'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './styles.module.css';
import Avatar from '@/commons/components/avatar';
import Input from '@/commons/components/input';
import { AnimalType } from '@/commons/constants/animal';
import { useChatRoom } from '../../hooks/index.binding.chatRoom.hook';

export default function ChatRoom() {
  const params = useParams();
  const postId = params?.id as string | undefined;

  // postId를 number로 변환 (NaN 처리 포함)
  const postIdNumber = isNaN(parseInt(postId || '', 10))
    ? 0
    : parseInt(postId || '', 10);

  // useChatRoom Hook 호출
  const { formattedMessages, sendMessage, isLoading, error, isBlocked } =
    useChatRoom({ postId: postIdNumber });

  // 메시지 입력 상태 관리
  const [messageInput, setMessageInput] = useState('');

  // 메시지 전송 핸들러
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isBlocked) {
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className={styles.chatRoom}>
        <div className={styles.messageList} aria-label="메시지 목록">
          <div className={styles.messagesContainer}>
            <div className={styles.messagesWrapper}>
              <p>로딩 중...</p>
            </div>
          </div>
        </div>
        <div className={styles.inputArea} aria-label="메시지 입력 영역">
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
    <div className={styles.chatRoom}>
      {/* 메시지 리스트 영역 */}
      <div className={styles.messageList} aria-label="메시지 목록">
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
      </div>

      {/* 입력 영역 */}
      <div className={styles.inputArea} aria-label="메시지 입력 영역">
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
              messageInput.trim() && !isBlocked
                ? 'var(--color-icon-interactive-secondary)'
                : undefined
            }
            onIconRightClick={
              messageInput.trim() && !isBlocked ? handleSendMessage : undefined
            }
            iconSize={20}
            disabled={isBlocked}
          />
        </div>
      </div>
    </div>
  );
}

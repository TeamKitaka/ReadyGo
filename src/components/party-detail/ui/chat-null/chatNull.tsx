'use client';

import React from 'react';
import Icon from '@/commons/components/icon';
import Input from '@/commons/components/input';
import styles from './styles.module.css';
import parentStyles from '../../styles.module.css';

export default function ChatNull() {
  return (
    <div className={parentStyles.chatArea}>
      <div className={`${parentStyles.chatLog} ${styles.chatLogCentered}`}>
        <div className={styles.chatLogContent}>
          <div className={styles.iconWrapper}>
            <Icon name="message-bubble" size={40} className={styles.icon} />
          </div>
          <p className={styles.mainMessage}>
            파티에 참여하면 채팅을 볼 수 있어요
          </p>
          <p className={styles.secondaryMessage}>
            오른쪽에서 참여하기 버튼을 눌러주세요
          </p>
        </div>
      </div>
      <div className={parentStyles.messageArea}>
        <Input
          variant="primary"
          state="disabled"
          size="m"
          placeholder="파티에 참여하면 메세지를 보낼 수 있어요"
          iconRight="send"
          iconSize={20}
          disabled
        />
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import styles from './styles.module.css';
import MemberItem from '../member-item/memberItem';
import { useMemberList } from '../../hooks/index.binding.memberList.hook';

export default function MemberList() {
  const params = useParams();
  const partyId = params?.id as string | undefined;

  // postId를 URL 파라미터에서 가져오고 number로 변환
  const postIdNumber = isNaN(parseInt(partyId ?? '', 10))
    ? 0
    : parseInt(partyId ?? '', 10);

  // useMemberList Hook 호출
  const { formattedMembers, currentMemberCount, maxMemberCount, error } =
    useMemberList({ postId: postIdNumber });

  // 에러 상태 처리 (콘솔 로그만 출력, UI는 유지)
  if (error) {
    console.error('MemberList error:', error);
  }

  return (
    <div className={styles.container}>
      <div className={styles.mainArea}>
        <div className={styles.partyTitle}>
          파티원
          <div className={styles.memberCount}>
            <span className={styles.currentCount}>{currentMemberCount}</span>
            <span className={styles.maxCount}> / {maxMemberCount}명</span>
          </div>
        </div>
        <div className={styles.partyItemGroup}>
          {formattedMembers.map((item, index) => {
            if (item.type === 'member') {
              return (
                <MemberItem
                  key={item.userId || `member-${index}`}
                  type={item.isLeader ? 'leader' : 'member'}
                  userId={item.userId}
                  name={item.nickname}
                  animalType={item.animalType}
                />
              );
            } else {
              // empty 타입
              return <MemberItem key={`empty-${index}`} type="empty" />;
            }
          })}
        </div>
      </div>
    </div>
  );
}

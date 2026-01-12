'use client';

import React, { useState } from 'react';
import styles from './styles.module.css';
import Searchbar from '@/commons/components/searchbar';
import FriendLists from '../friend-lists/friendLists';
import FriendRequests from '../friend-requests/friendRequests';
import { useFriendRequests } from '@/hooks/useFriendRequests';

export default function FriendsContainer() {
  const [activeTab, setActiveTab] = useState<'list' | 'request'>('list');
  const { requests } = useFriendRequests();
  const friendRequestCount = requests.length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>친구</h1>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Search Bar */}
        <div className={styles.searchContainer}>
          <Searchbar placeholder="검색하기">
            <input
              type="text"
              placeholder="검색하기"
              className={styles.searchInput}
            />
          </Searchbar>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'list' ? '' : styles.tabInactive}`}
            onClick={() => setActiveTab('list')}
          >
            <span className={styles.tabText}>친구 목록</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'request' ? '' : styles.tabInactive}`}
            onClick={() => setActiveTab('request')}
          >
            <span className={styles.tabText}>친구 요청</span>
            {friendRequestCount > 0 && (
              <div className={styles.badge}>
                <span className={styles.badgeText}>{friendRequestCount}</span>
              </div>
            )}
          </button>
        </div>

        {/* Friend List */}
        {activeTab === 'list' && <FriendLists />}

        {/* Friend Request List */}
        {activeTab === 'request' && <FriendRequests />}
      </div>
    </div>
  );
}

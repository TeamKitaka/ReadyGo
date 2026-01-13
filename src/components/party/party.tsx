'use client';

import React, { useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import Selectbox, { type SelectboxItem } from '@/commons/components/selectbox';
import Searchbar from '@/commons/components/searchbar';
import Button from '@/commons/components/button';
import Icon from '@/commons/components/icon';
import Card from './ui/card';
import SkeletonCard from './ui/skeleton-card/skeleton-card';
import { useLinkModal } from './hooks/index.link.modal.hook';
import { useInfinitePartyList } from './hooks/index.infinityScroll.hook';
import { useLinkRouting } from './hooks/index.link.routing.hook';
import { useFloatButton } from './hooks/index.float.hook';
import { useFilter } from './hooks/index.filter.hook';
import { usePartyTab } from './hooks/index.partyTab.hook';
import { usePartySort } from './hooks/index.sort.hook';
import styles from './styles.module.css';

export default function Party() {
  const { activeTab, setActiveTab } = usePartyTab();
  const { selectedGenre, searchQuery, setSelectedGenre, setSearchQuery } =
    useFilter();
  const { sortOption, setSortOption } = usePartySort();
  const { openPartySubmitModal } = useLinkModal();
  const {
    data: partyList,
    hasMore,
    loadMore,
    isLoading,
    error,
  } = useInfinitePartyList(selectedGenre, searchQuery, activeTab, sortOption);
  const { navigateToPartyDetail } = useLinkRouting();
  const { scrollToTop } = useFloatButton();

  // Layout의 children 영역(.children)의 스크롤을 감지하는 함수
  const getScrollParent = useCallback(() => {
    if (typeof document === 'undefined') {
      return null;
    }
    // Layout의 children 영역을 찾기 (main 요소)
    const childrenElement = document.querySelector('main[class*="children"]');
    return childrenElement as HTMLElement | null;
  }, []);

  const genreItems: SelectboxItem[] = [
    { id: 'all', value: '전체' },
    { id: 'Action', value: '액션' },
    { id: 'Adventure', value: '모험' },
    { id: 'Casual', value: '캐주얼' },
    { id: 'Early Access', value: '얼리 액세스' },
    { id: 'Free To Play', value: '무료 플레이' },
    { id: 'Indie', value: '인디' },
    { id: 'Massively Multiplayer', value: 'MMO' },
    { id: 'Nudity', value: '성인 요소' },
    { id: 'Racing', value: '레이싱' },
    { id: 'RPG', value: 'RPG' },
    { id: 'Simulation', value: '시뮬레이션' },
    { id: 'Sports', value: '스포츠' },
    { id: 'Strategy', value: '전략' },
    { id: 'Violent', value: '폭력성' },
  ];

  const handleGenreSelect = (item: SelectboxItem) => {
    setSelectedGenre(item.id === 'all' ? undefined : item.id);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className={styles.container} data-testid="party-page">
      <div className={styles.titleArea}>
        <h1 className={styles.title}>파티 모집</h1>
        <p className={styles.subtitle}>함께 게임할 파티를 찾거나 모집하세요</p>
      </div>
      <div className={styles.contentWrapper}>
        <div className={styles.searchArea}>
          <div className={styles.filterSearchWrapper}>
            <div className={styles.filterSelect}>
              <Selectbox
                items={genreItems}
                selectedId={selectedGenre || undefined}
                onSelect={handleGenreSelect}
                placeholder="모든 게임 장르"
                className={styles.selectboxWidth}
                data-testid="party-genre-select"
              />
            </div>
            <div className={styles.searchInput}>
              <Searchbar
                placeholder="게임 이름으로 검색하기"
                className={styles.searchbarWidth}
                value={searchQuery}
                onChange={handleSearchChange}
                data-testid="party-search-input"
              />
            </div>
          </div>
          <div className={styles.newPartyButton}>
            <Button
              variant="secondary"
              size="m"
              shape="rectangle"
              className={styles.buttonWidth}
              onClick={openPartySubmitModal}
              data-testid="party-create-button"
            >
              새 파티 만들기
            </Button>
          </div>
        </div>
        <div className={styles.tabArea}>
          <div className={styles.tabWrapper}>
            <button
              className={`${styles.tab} ${activeTab === 'all' ? '' : styles.tabInactive}`}
              onClick={() => setActiveTab('all')}
              data-testid="party-tab-all"
            >
              전체 파티
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'participating' ? '' : styles.tabInactive}`}
              onClick={() => setActiveTab('participating')}
              data-testid="party-tab-participating"
            >
              참여 중인 파티
            </button>
          </div>
          <div className={styles.sortArea}>
            <button
              className={`${styles.sortOption} ${sortOption === 'latest' ? styles.sortOptionActive : ''}`}
              onClick={() => setSortOption('latest')}
              data-testid="party-sort-latest"
            >
              최신순
            </button>
            <span className={styles.sortSeparator}>|</span>
            <button
              className={`${styles.sortOption} ${sortOption === 'deadline' ? styles.sortOptionActive : ''}`}
              onClick={() => setSortOption('deadline')}
              data-testid="party-sort-deadline"
            >
              마감임박순
            </button>
          </div>
        </div>
        <InfiniteScroll
          pageStart={0}
          loadMore={loadMore}
          hasMore={hasMore}
          loader={
            <div key="loader" className={styles.loader}>
              로딩 중...
            </div>
          }
          useWindow={false}
          getScrollParent={getScrollParent}
          threshold={250}
          initialLoad={false}
        >
          <div className={styles.mainArea} data-testid="party-main-area">
            {isLoading && partyList.length === 0 ? (
              <>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <SkeletonCard key={index} />
                ))}
              </>
            ) : error ? (
              <div>데이터를 불러오는 중 오류가 발생했습니다.</div>
            ) : partyList.length === 0 ? (
              <div>파티가 없습니다</div>
            ) : (
              <>
                {partyList.map((party) => (
                  <Card
                    key={party.partyId || party.title}
                    {...party}
                    onJoinClick={() => {
                      if (party.partyId) {
                        navigateToPartyDetail(party.partyId);
                      }
                    }}
                  />
                ))}
                {/* {!hasMore && partyList.length > 0 && (
                  <div className={styles.statusMessage}>
                    마지막 게시물입니다
                  </div>
                )} */}
              </>
            )}
          </div>
        </InfiniteScroll>
      </div>
      <button
        className={styles.floatButton}
        aria-label="맨 위로 이동"
        onClick={scrollToTop}
        data-testid="party-float-button"
      >
        <Icon name="chevron-up" size={24} />
      </button>
    </div>
  );
}

/**
 * Get Match List Service
 * 
 * 책임:
 * - 매칭 화면용 매칭 목록 조회 (12개)
 * - 5분 캐시 + 실시간 계산
 * - 중복 방지 (조회 24h + 노출 4h)
 * - 온라인 우선 정렬
 * 
 * 비책임:
 * - DB 접근 (Repository에서 처리)
 * - API 응답 (API Route에서 처리)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { getMatchCandidates } from './getMatchCandidates.service';
import { calculateMatchResult } from './calculateMatchResult.service';
import * as matchCacheRepo from '@/repositories/matchResultsCache.repository';
import * as matchExposureLogRepo from '@/repositories/matchExposureLog.repository';
import * as matchRecentViewsRepo from '@/repositories/matchRecentViews.repository';
import * as userProfilesRepo from '@/repositories/userProfiles.repository';
import * as userStatusRepo from '@/repositories/userStatus.repository';
import * as steamGamesRepo from '@/repositories/steamGames.repository';
import { getAvatarImagePath } from '@/lib/avatar/getAvatarImagePath';
import { getEffectiveStatus } from '@/stores/user-status.store';

const DEFAULT_MIN_SCORE = 65; // 기본값: 65% 이상 (중간 매칭율, 셀렉트 박스 미선택 시)
const CACHE_CONTEXT = 'match';

export interface MatchListOptions {
  minScore?: number;
  statusFilter?: 'all' | 'online' | 'offline';
  limit?: number;
  refresh?: boolean; // 강제 새로고침 (캐시 스킵)
}

/**
 * 매칭 화면용 매칭 목록 조회
 * 
 * @param client Supabase 클라이언트
 * @param viewerId viewer 사용자 ID
 * @param options 필터 옵션
 * @returns 온라인 우선 정렬된 매칭 결과
 */
export async function getMatchList(
  client: SupabaseClient<Database>,
  viewerId: string,
  options: MatchListOptions = {}
) {
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const limit = options.limit ?? 12;
  const refresh = options.refresh ?? false;
  
  // 1. 캐시 확인 (refresh=true일 때는 스킵)
  if (!refresh) {
    const { data: cached } = await matchCacheRepo.findByViewerAndContext(
      client,
      viewerId,
      CACHE_CONTEXT
    );
    
    if (cached && cached.length >= limit) {
      return await enrichAndSort(client, cached.slice(0, limit), options.statusFilter);
    }
  }
  
  // 2. 후보 조회
  const candidates = await getMatchCandidates(client, viewerId);
  
  // 3. 중복 제외
  const [{ data: recentViews }, { data: recentExposures }] = await Promise.all([
    matchRecentViewsRepo.findByViewer(client, viewerId, 24), // 24시간 (프로필 클릭)
    matchExposureLogRepo.findRecentByViewer(client, viewerId, 1), // 1시간 (노출 이력) - 새로고침 허용
  ]);
  
  const excludeIds = new Set([
    ...(recentViews?.map((v) => v.target_user_id) || []),
    ...(recentExposures?.map((e) => e.target_id) || []),
  ]);
  
  const filtered = candidates.filter((c) => !excludeIds.has(c.userId));
  
  // 4. 실시간 계산 (minScore에 따라 계산량 조정)
  // 높은 매칭율(75% 이상): 40명 (빠름)
  // 중간 매칭율(65% 이상): 60명 (중간)
  // 모든 매칭율(50% 이상): 100명 (느림, 다양성 확보)
  const calculateCount = minScore >= 75 ? 40 : minScore >= 65 ? 60 : 100;
  const toCalculate = filtered.slice(0, calculateCount);
  const calculated = await Promise.allSettled(
    toCalculate.map(async (c) => {
      const result = await calculateMatchResult(client, viewerId, c.userId);
      return {
        ...result,
        targetUserId: c.userId, // targetUserId 추가
      };
    })
  );
  
  const results = calculated
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<any>).value)
    .filter((r) => r.finalScore >= minScore);
  
  // 5. 점수대별 샘플링 (다양성 확보)
  const top = sampleByScoreRange(results, minScore, limit);
  
  // 6. 캐시 저장
  await Promise.all(
    top.map((r) =>
      matchCacheRepo.upsert(client, {
        viewer_id: viewerId,
        target_id: r.targetUserId,
        score: r.finalScore,
        reasons: r.reasons,
        tags: r.tags,
        context: CACHE_CONTEXT,
      })
    )
  );
  
  // 7. 노출 이력 기록
  const exposedIds = top.map((r) => r.targetUserId);
  await matchExposureLogRepo.bulkInsert(
    client,
    viewerId,
    exposedIds,
    'match_list'
  );
  
  // 8. 프로필/상태 추가 + 온라인 우선 정렬
  return await enrichAndSort(client, top, options.statusFilter);
}

/**
 * 점수대별 샘플링
 * 
 * 전략:
 * - 75% 이상: 고득점만 (높은 매칭율)
 * - 65% 이상: 65~75% 위주 + 75% 이상 소수 (중간 매칭율)
 * - 50% 이상: 전 구간 골고루 (모든 매칭율)
 * 
 * @param results 모든 매칭 결과
 * @param minScore 최소 점수
 * @param limit 목표 개수
 * @returns 샘플링된 결과
 */
function sampleByScoreRange(results: any[], minScore: number, limit: number): any[] {
  if (results.length === 0) return [];
  
  // 점수대별로 분류
  const high = results.filter(r => r.finalScore >= 75); // 75% 이상
  const mid = results.filter(r => r.finalScore >= 65 && r.finalScore < 75); // 65~75%
  const low = results.filter(r => r.finalScore >= 50 && r.finalScore < 65); // 50~65%
  
  let sampled: any[] = [];
  
  if (minScore >= 75) {
    // "높은 매칭율 (75% 이상)": 75% 이상만
    sampled = shuffleArray(high).slice(0, limit);
  } else if (minScore >= 65) {
    // "중간 매칭율 (65% 이상)": 65~75% 위주 + 75% 이상 소수
    const midCount = Math.min(mid.length, Math.ceil(limit * 0.7)); // 70%
    const highCount = Math.min(high.length, limit - midCount); // 나머지
    
    sampled = [
      ...shuffleArray(mid).slice(0, midCount),
      ...shuffleArray(high).slice(0, highCount),
    ];
  } else {
    // "모든 매칭율 (50% 이상)": 전 구간 골고루
    const lowCount = Math.min(low.length, Math.ceil(limit * 0.4)); // 40%
    const midCount = Math.min(mid.length, Math.ceil(limit * 0.35)); // 35%
    const highCount = Math.min(high.length, limit - lowCount - midCount); // 나머지 25%
    
    sampled = [
      ...shuffleArray(low).slice(0, lowCount),
      ...shuffleArray(mid).slice(0, midCount),
      ...shuffleArray(high).slice(0, highCount),
    ];
  }
  
  // 최종 랜덤 섞기 (점수대 내에서는 랜덤)
  return shuffleArray(sampled).slice(0, limit);
}

/**
 * 배열 랜덤 섞기 (단순 버전)
 */
function shuffleArray<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

/**
 * Fisher-Yates shuffle 알고리즘
 * 
 * Math.random().sort()보다 더 공정한 랜덤 분포 보장
 * 시간 복잡도: O(n)
 * 
 * @param array 섞을 배열
 * @returns 섞인 새 배열
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  
  for (let i = result.length - 1; i > 0; i--) {
    // 0부터 i까지 중 랜덤 인덱스 선택
    const j = Math.floor(Math.random() * (i + 1));
    
    // 요소 교환
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

/**
 * 프로필/상태 추가 + 온라인 우선 정렬
 * 
 * @param client Supabase 클라이언트
 * @param results 매칭 결과 목록
 * @param statusFilter 상태 필터 ('all' | 'online' | 'offline')
 * @returns 온라인 우선 정렬된 결과
 */
async function enrichAndSort(
  client: SupabaseClient<Database>,
  results: any[],
  statusFilter?: string
) {
  if (results.length === 0) return [];
  
  // targetUserId 추출 (캐시: target_id, 실시간: targetUserId)
  const userIds = results.map((r) => r.target_id || r.targetUserId);
  
  // 1. reasons에서 모든 게임 ID 추출
  const allGameIds = new Set<number>();
  for (const result of results) {
    if (result.reasons) {
      for (const reason of result.reasons) {
        if (reason.detail.type === 'COMMON_GAME' && reason.detail.topGames) {
          // "Game 570" → 570으로 변환
          for (const gameStr of reason.detail.topGames) {
            const match = gameStr.match(/Game (\d+)/);
            if (match) {
              allGameIds.add(parseInt(match[1], 10));
            }
          }
        }
      }
    }
  }
  
  // 2. 프로필, 상태, 게임 정보 병렬 조회
  const [{ data: profiles }, { data: statuses }, gameNameMap] = await Promise.all([
    userProfilesRepo.findByUserIds(client, userIds),
    userStatusRepo.findByUserIds(client, userIds),
    steamGamesRepo.getGameNameMap(client, Array.from(allGameIds)),
  ]);
  
  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
  const statusMap = new Map(statuses?.map((s) => [s.user_id, s.status]) || []);
  
  // 3. 게임 이름 변환 헬퍼
  const replaceGameNames = (topGames: string[]): string[] => {
    return topGames.map((gameStr) => {
      const match = gameStr.match(/Game (\d+)/);
      if (match) {
        const appId = parseInt(match[1], 10);
        return gameNameMap.get(appId) || gameStr;
      }
      return gameStr;
    });
  };
  
  const enriched = results.map((r) => {
    const userId = r.target_id || r.targetUserId;
    const profile = profileMap.get(userId);
    const status = getEffectiveStatus(userId); // Presence 반영
    
    // 4. reasons의 게임 이름 변환
    const enrichedReasons = r.reasons
      ? r.reasons.map((reason: any) => {
          if (reason.detail.type === 'COMMON_GAME' && reason.detail.topGames) {
            return {
              ...reason,
              detail: {
                ...reason.detail,
                topGames: replaceGameNames(reason.detail.topGames),
              },
            };
          }
          return reason;
        })
      : [];
    
    return {
      ...r,
      reasons: enrichedReasons,
      profile: {
        userId,
        nickname: profile?.nickname || '알 수 없음',
        animalType: profile?.animal_type,
        avatarUrl: getAvatarImagePath(profile?.avatar_url, profile?.animal_type),
      },
      status,
      isOnline: status === 'online' || status === 'in_game',
    };
  });
  
  // 필터 적용
  let filtered = enriched;
  if (statusFilter === 'online') {
    filtered = enriched.filter((r) => r.isOnline);
  } else if (statusFilter === 'offline') {
    filtered = enriched.filter((r) => !r.isOnline);
  }
  
  // 온라인 우선 + 강력한 랜덤 (Fisher-Yates shuffle)
  const onlineUsers = filtered.filter((r) => r.isOnline);
  const offlineUsers = filtered.filter((r) => !r.isOnline);
  
  // 각 그룹을 Fisher-Yates shuffle로 섞기
  const shuffledOnline = fisherYatesShuffle(onlineUsers);
  const shuffledOffline = fisherYatesShuffle(offlineUsers);
  
  // 온라인 그룹 + 오프라인 그룹 합치기
  return [...shuffledOnline, ...shuffledOffline];
}


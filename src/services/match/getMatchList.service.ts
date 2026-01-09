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

const DEFAULT_MIN_SCORE = 50; // 50% 이상이면 충분 (실시간성 우선)
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
      console.debug('[getMatchList] Using cached results:', cached.length);
      return await enrichAndSort(client, cached.slice(0, limit), options.statusFilter);
    }
  } else {
    console.debug('[getMatchList] Refresh mode: skipping cache');
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
  
  console.debug('[getMatchList] 🔍 Debug:', {
    totalCandidates: candidates.length,
    recentViews: recentViews?.length || 0,
    recentExposures: recentExposures?.length || 0,
    excludedCount: excludeIds.size,
    excludedIds: Array.from(excludeIds).slice(0, 5), // 처음 5개만 로그
  });
  
  const filtered = candidates.filter((c) => !excludeIds.has(c.userId));
  
  console.debug('[getMatchList] After filtering:', filtered.length);
  
  // 4. 실시간 계산 (여유분 충분히 - 50% 이상 확보)
  const toCalculate = filtered.slice(0, 80); // 40 → 80으로 증가
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
  
  console.debug('[getMatchList] Calculated results:', {
    total: results.length,
    minScore,
    scoreDistribution: {
      '90+': results.filter(r => r.finalScore >= 90).length,
      '75-89': results.filter(r => r.finalScore >= 75 && r.finalScore < 90).length,
      '50-74': results.filter(r => r.finalScore >= 50 && r.finalScore < 75).length,
    }
  });
  
  // 5. 랜덤 섞기 (실시간성 우선, 점수 편향 제거)
  // 고득점자(90% 이상)도 랜덤하게 섞어서 다양성 확보
  const shuffled = results.sort(() => Math.random() - 0.5);
  const top = shuffled.slice(0, limit);
  
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
  
  console.debug('[getMatchList] Exposure recorded:', {
    count: exposedIds.length,
    ids: exposedIds.slice(0, 3), // 처음 3개만 로그
  });
  
  // 8. 프로필/상태 추가 + 온라인 우선 정렬
  return await enrichAndSort(client, top, options.statusFilter);
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
  
  // 온라인 우선 정렬 (같은 상태 내에서는 랜덤)
  return filtered.sort((a, b) => {
    if (a.isOnline !== b.isOnline) {
      return a.isOnline ? -1 : 1; // 온라인 우선
    }
    // 같은 상태면 랜덤 (실시간성 우선, 점수 편향 제거)
    return Math.random() - 0.5;
  });
}


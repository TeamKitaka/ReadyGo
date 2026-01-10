/**
 * Get Home Matches Service
 *
 * 책임:
 * - 홈 화면용 매칭 결과 조회 (최고 4명)
 * - 캐시 우선 조회 + 실시간 fallback
 * - 프로필/상태 정보 추가
 *
 * 비책임:
 * - Domain 계산 로직 (calculateMatchResult에 위임)
 * - UI 변환 (toMatchCardProps에 위임)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { getMatchCandidates } from './getMatchCandidates.service';
import { calculateMatchResult } from './calculateMatchResult.service';
import * as matchCacheRepo from '@/repositories/matchResultsCache.repository';
import * as userProfilesRepo from '@/repositories/userProfiles.repository';
import * as userStatusRepo from '@/repositories/userStatus.repository';
import * as steamGamesRepo from '@/repositories/steamGames.repository';
import { getAvatarImagePath } from '@/lib/avatar/getAvatarImagePath';

/**
 * 홈 화면 매칭 결과 조회
 *
 * 전략:
 * 1. 캐시에서 4개 이상 있으면 즉시 반환
 * 2. 부족하면 실시간 계산으로 보충
 * 3. 실시간 계산 결과는 캐시에 저장 (다음을 위해)
 *
 * @param client Supabase 클라이언트
 * @param viewerId viewer 사용자 ID
 * @returns 프로필 정보가 포함된 매칭 결과 (최대 4개)
 */
export const getHomeMatches = async (
  client: SupabaseClient<Database>,
  viewerId: string
) => {
  // 1. 후보 조회 (채팅/친구/차단 제외)
  const candidates = await getMatchCandidates(client, viewerId);
  const candidateIds = candidates.map((c) => c.userId);

  // 후보가 없으면 빈 배열 반환
  if (candidateIds.length === 0) {
    return [];
  }

  // 2. 캐시 조회
  const { data: cached } = await matchCacheRepo.findByViewer(
    client,
    viewerId,
    candidateIds
  );

  // 3. 캐시로 4개 이상 확보되면 즉시 반환
  if (cached && cached.length >= 4) {
    return await enrichWithProfiles(client, cached.slice(0, 4));
  }

  // 4. 부족하면 실시간 계산
  const cachedIds = new Set(cached?.map((c) => c.target_id) || []);
  const missing = candidateIds.filter((id) => !cachedIds.has(id));

  // 필요한 개수만 계산 (최대 8개)
  const needed = Math.min(8 - (cached?.length || 0), missing.length);

  const computed = await Promise.all(
    missing.slice(0, needed).map(async (targetId) => {
      try {
        const result = await calculateMatchResult(client, viewerId, targetId);

        // 캐시에 저장 (다음 요청을 위해)
        await matchCacheRepo.upsert(client, {
          viewer_id: viewerId,
          target_id: targetId,
          score: result.finalScore,
          reasons: result.reasons,
          tags: result.tags,
          context: 'home',
        });

        return {
          target_id: targetId,
          score: result.finalScore,
          reasons: result.reasons,
          tags: result.tags,
          computed_at: new Date().toISOString(),
        };
      } catch (error) {
        // 개별 계산 실패는 로그만 남기고 계속 진행
        console.error(
          `[getHomeMatches] Failed to calculate match for ${targetId}:`,
          error
        );
        return null;
      }
    })
  );

  // 실패한 계산 제외
  const validComputed = computed.filter((c) => c !== null);

  // 5. 병합 후 점수순 정렬, 상위 4개
  const all = [...(cached || []), ...validComputed];
  const sorted = all.sort((a, b) => b.score - a.score).slice(0, 4);

  return await enrichWithProfiles(client, sorted);
};

/**
 * 프로필 및 상태 정보 추가
 *
 * @param client Supabase 클라이언트
 * @param results 매칭 결과 배열
 * @returns 프로필 정보가 추가된 결과
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enrichWithProfiles = async (
  client: SupabaseClient<Database>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any[]
) => {
  if (results.length === 0) {
    return [];
  }

  const userIds = results.map((r) => r.target_id);

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
  const [{ data: profiles }, { data: statuses }, gameNameMap] =
    await Promise.all([
      userProfilesRepo.findByUserIds(client, userIds),
      userStatusRepo.findByUserIds(client, userIds),
      steamGamesRepo.getGameNameMap(client, Array.from(allGameIds)),
    ]);

  // Map으로 변환 (빠른 조회)
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

  return results.map((r) => {
    const profile = profileMap.get(r.target_id);
    const avatarUrl = getAvatarImagePath(
      profile?.avatar_url,
      profile?.animal_type
    );

    // 4. reasons의 게임 이름 변환
    const enrichedReasons = r.reasons
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        r.reasons.map((reason: any) => {
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
        userId: r.target_id,
        nickname: profile?.nickname || '알 수 없음',
        animalType: profile?.animal_type,
        avatarUrl,
      },
      status: statusMap.get(r.target_id) || 'offline',
    };
  });
};

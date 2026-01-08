/**
 * ❗ Generate Match Reasons
 *
 * 📌 책임 (Responsibility):
 * - MatchContext를 입력으로 받아 매칭 이유 목록 생성
 * - 최소 3개 이상의 Reason 항상 생성
 * - Steam 미연동 / Cold Start 상태에서도 동작
 * - 계산 로직은 별도 유틸 함수로 분리
 * - 오직 "비교 결과 사실"만 포함 (UI 가공 제외)
 *
 * 📌 입력:
 * - MatchContextCoreDTO: viewer와 target 사용자 간 매칭 계산 입력
 *
 * 📌 출력:
 * - MatchReasonCoreDTO[]: 매칭 이유 목록 (최소 3개, priority 포함)
 *
 * 📌 생성 정책:
 * - Steam 연동 시: COMMON_GAME, PLAY_TIME 우선 생성
 * - Steam 미연동 시: STYLE_SIMILARITY, ACTIVITY_PATTERN 우선 생성
 * - 항상 가능: ONLINE_NOW, RELIABILITY
 * - Reason은 "데이터 존재 여부"가 아니라 "비교 가능성"이 있으면 생성
 *
 * 📌 Priority 정책:
 * - HIGH: COMMON_GAME, STYLE_SIMILARITY (매칭 결정에 가장 중요)
 * - MEDIUM: PLAY_TIME, ACTIVITY_PATTERN, ONLINE_NOW (매칭에 도움)
 * - LOW: RELIABILITY, PARTY_EXPERIENCE (부가적인 정보)
 *
 * 📌 Baseline (Fallback) 정책:
 * - 데이터 부족으로 최소 3개를 채우지 못할 경우 baseline reason 생성
 * - isBaseline: true 플래그로 표시
 * - baseline 점수는 50 (중간값, 의미 없는 기본값)
 */

import type { MatchContextCoreDTO } from '@/commons/types/match/matchContextCore.dto';
import type { MatchReasonCoreDTO } from '@/commons/types/match/matchReasonCore.dto';
import {
  calculateTraitsSimilarity,
  findTopTrait,
} from '../utils/traitsSimilarity';
import { calculateScheduleSimilarity } from '../utils/scheduleSimilarity';
import { calculateGenreSimilarity } from '../utils/steamGenreSimilarity';

/**
 * 매칭 이유 생성
 *
 * @param context - MatchContext 입력
 * @returns 매칭 이유 목록 (최소 3개, priority 포함)
 *
 * @example
 * ```typescript
 * // Steam 연동된 경우
 * const context: MatchContextCoreDTO = {
 *   viewer: {
 *     userId: 'viewer-uuid',
 *     traits: { traits: { cooperation: 58, exploration: 85, strategy: 72, leadership: 45, social: 90 } },
 *     activity: { isOnline: true },
 *     steam: { steamGames: [570, 730, 440] }
 *   },
 *   target: {
 *     userId: 'target-uuid',
 *     traits: { traits: { cooperation: 62, exploration: 80, strategy: 68, leadership: 50, social: 88 } },
 *     activity: { isOnline: false },
 *     steam: { steamGames: [570, 730] }
 *   }
 * };
 *
 * const reasons = generateMatchReasons(context);
 * // [
 * //   { detail: { type: 'COMMON_GAME', gameCount: 2, topGames: ['Game 570', 'Game 730'] }, priority: 'HIGH' },
 * //   { detail: { type: 'STYLE_SIMILARITY', similarityScore: 95, topTrait: 'social' }, priority: 'HIGH' },
 * //   { detail: { type: 'RELIABILITY', reliabilityScore: 80 }, priority: 'LOW' }
 * // ]
 * ```
 *
 * @example
 * ```typescript
 * // Steam 미연동 Cold Start 경우
 * const context: MatchContextCoreDTO = {
 *   viewer: {
 *     userId: 'viewer-uuid',
 *     traits: { traits: { cooperation: 58, exploration: 85, strategy: 72, leadership: 45, social: 90 } },
 *     activity: {
 *       schedule: [{ dayType: 'weekday', timeSlot: '18-24' }],
 *       isOnline: true
 *     }
 *   },
 *   target: {
 *     userId: 'target-uuid',
 *     traits: { traits: { cooperation: 62, exploration: 80, strategy: 68, leadership: 50, social: 88 } },
 *     activity: {
 *       schedule: [{ dayType: 'weekday', timeSlot: '18-24' }]
 *     }
 *   }
 * };
 *
 * const reasons = generateMatchReasons(context);
 * // [
 * //   { detail: { type: 'STYLE_SIMILARITY', similarityScore: 95, topTrait: 'social' }, priority: 'HIGH' },
 * //   { detail: { type: 'ACTIVITY_PATTERN', patternScore: 100, commonTimeSlots: [{ dayType: 'weekday', timeSlot: '18-24' }] }, priority: 'MEDIUM' },
 * //   { detail: { type: 'ONLINE_NOW', isOnline: true }, priority: 'MEDIUM' }
 * // ]
 * ```
 */
export const generateMatchReasons = (
  context: MatchContextCoreDTO
): MatchReasonCoreDTO[] => {
  const reasons: MatchReasonCoreDTO[] = [];

  // 1. COMMON_GAME (Steam 연동 시) - HIGH priority
  const viewerGames = context.viewer.steam?.steamGames ?? [];
  const targetGames = context.target.steam?.steamGames ?? [];
  if (viewerGames.length > 0 && targetGames.length > 0) {
    const commonGames = viewerGames.filter((game) =>
      targetGames.includes(game)
    );
    if (commonGames.length > 0) {
      // 실제로는 게임 ID를 게임 이름으로 변환하는 로직 필요
      // 여기서는 단순화를 위해 게임 ID를 그대로 사용
      const topGames = commonGames.slice(0, 2).map((id) => `Game ${id}`);
      reasons.push({
        detail: {
          type: 'COMMON_GAME',
          gameCount: commonGames.length,
          topGames,
        },
        priority: 'HIGH',
      });
    }
  }

  // 2. STYLE_SIMILARITY (Traits 기반) - HIGH priority
  const viewerTraits = context.viewer.traits?.traits;
  const targetTraits = context.target.traits?.traits;
  if (viewerTraits && targetTraits) {
    const similarityScore = calculateTraitsSimilarity(
      viewerTraits,
      targetTraits
    );
    const topTrait = findTopTrait(viewerTraits, targetTraits);
    reasons.push({
      detail: {
        type: 'STYLE_SIMILARITY',
        similarityScore,
        topTrait,
      },
      priority: 'HIGH',
    });
  }

  // 3. ACTIVITY_PATTERN (플레이 시간대 기반) - MEDIUM priority
  const viewerSchedule = context.viewer.activity?.schedule ?? [];
  const targetSchedule = context.target.activity?.schedule ?? [];
  if (viewerSchedule.length > 0 && targetSchedule.length > 0) {
    // 유사도 점수 계산 (유틸 함수 사용)
    const patternScore = calculateScheduleSimilarity(
      viewerSchedule,
      targetSchedule
    );

    // 공통 시간대 찾기
    const commonSlots = viewerSchedule.filter((vs) =>
      targetSchedule.some(
        (ts) => ts.dayType === vs.dayType && ts.timeSlot === vs.timeSlot
      )
    );

    if (commonSlots.length > 0) {
      // UI 가공 제거: 원시 데이터만 전달
      reasons.push({
        detail: {
          type: 'ACTIVITY_PATTERN',
          patternScore,
          commonTimeSlots: commonSlots,
        },
        priority: 'MEDIUM',
      });
    }
  }

  // 4. ONLINE_NOW (현재 온라인 상태) - MEDIUM priority
  const targetOnline = context.target.activity?.isOnline ?? false;
  if (targetOnline) {
    reasons.push({
      detail: {
        type: 'ONLINE_NOW',
        isOnline: true,
      },
      priority: 'MEDIUM',
    });
  }

  // 5. PLAY_TIME (플레이 시간 유사성) - MEDIUM priority
  const viewerPlayTime = context.viewer.steam?.totalPlayTime;
  const targetPlayTime = context.target.steam?.totalPlayTime;
  if (
    viewerPlayTime !== undefined &&
    targetPlayTime !== undefined &&
    viewerPlayTime > 0 &&
    targetPlayTime > 0
  ) {
    const ratio =
      Math.min(viewerPlayTime, targetPlayTime) /
      Math.max(viewerPlayTime, targetPlayTime);
    const matchScore = Math.round(ratio * 100);
    if (matchScore >= 60) {
      reasons.push({
        detail: {
          type: 'PLAY_TIME',
          matchScore,
        },
        priority: 'MEDIUM',
      });
    }
  }

  // 6. RELIABILITY (신뢰도) - LOW priority
  const reliabilityScore = context.target.reliability?.reliabilityScore;
  if (reliabilityScore !== undefined && reliabilityScore >= 60) {
    reasons.push({
      detail: {
        type: 'RELIABILITY',
        reliabilityScore,
      },
      priority: 'LOW',
    });
  }

  // 최소 3개 보장: 부족하면 baseline reason 추가
  if (reasons.length < 3) {
    // STYLE_SIMILARITY가 없으면 추가 (baseline)
    if (!reasons.some((r) => r.detail.type === 'STYLE_SIMILARITY')) {
      reasons.push({
        detail: {
          type: 'STYLE_SIMILARITY',
          similarityScore: 50, // 중간값 (의미 없는 기본값)
          topTrait: 'cooperation',
        },
        priority: 'HIGH',
        isBaseline: true, // baseline 플래그
      });
    }
    // ACTIVITY_PATTERN이 없으면 추가 (baseline)
    if (
      !reasons.some((r) => r.detail.type === 'ACTIVITY_PATTERN') &&
      reasons.length < 3
    ) {
      reasons.push({
        detail: {
          type: 'ACTIVITY_PATTERN',
          patternScore: 50, // 중간값 (의미 없는 기본값)
          commonTimeSlots: [],
        },
        priority: 'MEDIUM',
        isBaseline: true, // baseline 플래그
      });
    }
    // RELIABILITY가 없으면 추가 (baseline)
    if (
      !reasons.some((r) => r.detail.type === 'RELIABILITY') &&
      reasons.length < 3
    ) {
      reasons.push({
        detail: {
          type: 'RELIABILITY',
          reliabilityScore: 50, // 중간값 (의미 없는 기본값)
        },
        priority: 'LOW',
        isBaseline: true, // baseline 플래그
      });
    }
  }

  // Steam 관련 설명 추가
  const viewerSteam = context.viewer.steam;
  const targetSteam = context.target.steam;

  if (viewerSteam && targetSteam) {
    // 1. 장르 일치
    const viewerGenres = viewerSteam.mainGenres ?? [];
    const targetGenres = targetSteam.mainGenres ?? [];

    if (viewerGenres.length > 0 && targetGenres.length > 0) {
      const genreSimilarity = calculateGenreSimilarity(
        viewerGenres,
        targetGenres
      );

      if (genreSimilarity >= 60) {
        // 공통 장르 찾기
        const commonGenres = viewerGenres.filter((genre) =>
          targetGenres.some((tg) => tg.toLowerCase() === genre.toLowerCase())
        );

        if (commonGenres.length > 0) {
          const [genreName] = commonGenres; // 첫 번째 공통 장르
          reasons.push({
            detail: {
              type: 'STEAM_GENRE',
              genre: genreName,
              similarity: genreSimilarity,
            },
            priority: 'MEDIUM',
            isBaseline: false,
          });
        }
      }
    }

    // 2. 플레이 스타일 유사
    const viewerStyle = viewerSteam.playStyle;
    const targetStyle = targetSteam.playStyle;

    if (viewerStyle && targetStyle) {
      // 동일하거나 인접한 스타일
      const isCompatible =
        viewerStyle === targetStyle ||
        (viewerStyle === 'casual' && targetStyle === 'regular') ||
        (viewerStyle === 'regular' && targetStyle === 'casual') ||
        (viewerStyle === 'regular' && targetStyle === 'hardcore') ||
        (viewerStyle === 'hardcore' && targetStyle === 'regular');

      if (isCompatible) {
        reasons.push({
          detail: {
            type: 'STEAM_PLAYSTYLE',
            viewerStyle,
            targetStyle,
          },
          priority: 'LOW',
          isBaseline: false,
        });
      }
    }
  }

  // 상위 5개로 제한
  return reasons.slice(0, 5);
};

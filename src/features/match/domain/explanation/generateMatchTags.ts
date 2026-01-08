/**
 * ❗ Generate Match Tags
 *
 * 📌 책임 (Responsibility):
 * - MatchContext를 입력으로 받아 매칭 태그 목록 생성
 * - 최소 3개 이상의 Tag 항상 생성
 * - Steam 미연동 / Cold Start 상태에서도 동작
 * - UI에서 그대로 출력 가능한 5~6자 이내 짧은 문자열
 * - 계산 로직은 별도 유틸 함수 사용
 *
 * 📌 입력:
 * - MatchContextCoreDTO: viewer와 target 사용자 간 매칭 계산 입력
 *
 * 📌 출력:
 * - MatchTagCoreDTO[]: 매칭 태그 목록 (최소 3개)
 *
 * 📌 생성 정책:
 * - Steam 연동 시: '같은게임', '플타임일치' 등
 * - Steam 미연동 시: '스타일유사', '시간대일치' 등
 * - 항상 가능: '지금온라인', '신뢰높음' 등
 */

import type { MatchContextCoreDTO } from '@/commons/types/match/matchContextCore.dto';
import type { MatchTagCoreDTO } from '@/commons/types/match/matchTagCore.dto';
import { calculateTraitsSimilarity } from '../utils/traitsSimilarity';
import { calculateScheduleSimilarity } from '../utils/scheduleSimilarity';
import { calculateGenreSimilarity } from '../utils/steamGenreSimilarity';
import { animalCompatibilities } from '@/commons/constants/animal/animal.compat';
import { AnimalType } from '@/commons/constants/animal';

/**
 * 매칭 태그 생성
 *
 * @param context - MatchContext 입력
 * @returns 매칭 태그 목록 (최소 3개)
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
 *     steam: { steamGames: [570, 730] }
 *   }
 * };
 *
 * const tags = generateMatchTags(context);
 * // [
 * //   { label: '같은게임' },
 * //   { label: '스타일유사' },
 * //   { label: '신뢰높음' }
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
 * const tags = generateMatchTags(context);
 * // [
 * //   { label: '스타일유사' },
 * //   { label: '시간대일치' },
 * //   { label: '지금온라인' }
 * // ]
 * ```
 */
export const generateMatchTags = (
  context: MatchContextCoreDTO
): MatchTagCoreDTO[] => {
  const tags: MatchTagCoreDTO[] = [];

  // 1. 같은게임 (Steam 공통 게임)
  const viewerGames = context.viewer.steam?.steamGames ?? [];
  const targetGames = context.target.steam?.steamGames ?? [];
  if (viewerGames.length > 0 && targetGames.length > 0) {
    const commonGames = viewerGames.filter((game) =>
      targetGames.includes(game)
    );
    if (commonGames.length > 0) {
      tags.push({ label: '같은게임' });
    }
  }

  // 2. 플타임일치 (Steam 플레이 시간 유사)
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
    if (ratio >= 0.6) {
      tags.push({ label: '플타임일치' });
    }
  }

  // 3. 스타일유사 (Traits 유사도)
  const viewerTraits = context.viewer.traits?.traits;
  const targetTraits = context.target.traits?.traits;
  if (viewerTraits && targetTraits) {
    const similarityScore = calculateTraitsSimilarity(
      viewerTraits,
      targetTraits
    );
    if (similarityScore >= 70) {
      tags.push({ label: '스타일유사' });
    }
  }

  // 4. 시간잘맞음 (플레이 시간대 공통) - "시간대일치"에서 변경
  const viewerSchedule = context.viewer.activity?.schedule ?? [];
  const targetSchedule = context.target.activity?.schedule ?? [];
  if (viewerSchedule.length > 0 && targetSchedule.length > 0) {
    const scheduleScore = calculateScheduleSimilarity(
      viewerSchedule,
      targetSchedule
    );
    if (scheduleScore > 0) {
      tags.push({ label: '시간잘맞음' });
    }
  }

  // 5. 지금온라인 (Target 온라인 상태)
  const targetOnline = context.target.activity?.isOnline ?? false;
  if (targetOnline) {
    tags.push({ label: '지금온라인' });
  }

  // 6. 매너좋음 (신뢰도 점수 - 서비스 내 매너 점수)
  const reliabilityScore = context.target.reliability?.reliabilityScore;
  if (reliabilityScore !== undefined && reliabilityScore >= 70) {
    tags.push({ label: '매너좋음' });
  }

  // 7. 경험유사 (파티 경험 유사)
  const viewerPartyCount = context.viewer.reliability?.partyCount;
  const targetPartyCount = context.target.reliability?.partyCount;
  if (
    viewerPartyCount !== undefined &&
    targetPartyCount !== undefined &&
    viewerPartyCount > 0 &&
    targetPartyCount > 0
  ) {
    const ratio =
      Math.min(viewerPartyCount, targetPartyCount) /
      Math.max(viewerPartyCount, targetPartyCount);
    if (ratio >= 0.6) {
      tags.push({ label: '경험유사' });
    }
  }

  // Steam 관련 태그 추가
  const viewerSteam = context.viewer.steam;
  const targetSteam = context.target.steam;

  if (viewerSteam && targetSteam) {
    // 1. 같은취향 (장르 유사도 70% 이상) - "장르일치"에서 변경
    const viewerGenres = viewerSteam.mainGenres ?? [];
    const targetGenres = targetSteam.mainGenres ?? [];

    if (viewerGenres.length > 0 && targetGenres.length > 0) {
      const genreSimilarity = calculateGenreSimilarity(
        viewerGenres,
        targetGenres
      );

      if (genreSimilarity >= 70) {
        tags.push({ label: '같은취향' });
      }
    }

    // 2. 플타임유사 (Play Style 동일 또는 인접)
    const viewerStyle = viewerSteam.playStyle;
    const targetStyle = targetSteam.playStyle;

    if (viewerStyle && targetStyle) {
      const isCompatible =
        viewerStyle === targetStyle ||
        (viewerStyle === 'casual' && targetStyle === 'regular') ||
        (viewerStyle === 'regular' && targetStyle === 'casual') ||
        (viewerStyle === 'regular' && targetStyle === 'hardcore') ||
        (viewerStyle === 'hardcore' && targetStyle === 'regular');

      if (isCompatible) {
        tags.push({ label: '플타임유사' });
      }
    }
  }

  // 8. 천생연분 / 궁합좋음 (동물 궁합)
  const viewerAnimal = context.viewer.traits?.animalType as AnimalType | undefined;
  const targetAnimal = context.target.traits?.animalType as AnimalType | undefined;
  
  if (
    viewerAnimal &&
    targetAnimal &&
    viewerAnimal !== AnimalType.unknown &&
    targetAnimal !== AnimalType.unknown
  ) {
    const compatibility = animalCompatibilities[viewerAnimal];
    if (compatibility) {
      if (compatibility.bestMatches.includes(targetAnimal)) {
        tags.push({ label: '천생연분' });
      } else if (compatibility.goodMatches.includes(targetAnimal)) {
        tags.push({ label: '궁합좋음' });
      }
    }
  }

  // 9. 파티러버 (파티 경험이 많은 경우)
  // targetPartyCount는 위에서 이미 정의됨 (line 165)
  if (targetPartyCount !== undefined && targetPartyCount >= 20) {
    tags.push({ label: '파티러버' });
  }

  // 10. 베테랑 (높은 신뢰도 + 많은 파티 경험)
  if (
    reliabilityScore !== undefined &&
    reliabilityScore >= 80 &&
    targetPartyCount !== undefined &&
    targetPartyCount >= 30
  ) {
    tags.push({ label: '베테랑' });
  }

  // 11. 활동적 (플레이 시간대가 다양함)
  if (targetSchedule.length >= 4) {
    tags.push({ label: '활동적' });
  }

  // 12. 꾸준함 (신뢰도 중상 + 최근 활동 지속)
  // 신뢰도가 50 이상이면 꾸준한 유저로 판단
  if (reliabilityScore !== undefined && reliabilityScore >= 50) {
    tags.push({ label: '꾸준함' });
  }

  // 13. 협동형 (cooperation trait 상위)
  if (targetTraits && targetTraits.cooperation >= 70) {
    tags.push({ label: '협동형' });
  }

  // 14. 전략형 (strategy 또는 leadership trait 상위)
  if (
    targetTraits &&
    (targetTraits.strategy >= 70 || targetTraits.leadership >= 70)
  ) {
    tags.push({ label: '전략형' });
  }

  // 15. 집중형 (긴 세션 플레이 - Steam totalPlayTime이 많은 경우)
  if (targetSteam && targetSteam.totalPlayTime && targetSteam.totalPlayTime >= 1000) {
    tags.push({ label: '집중형' });
  }

  // 16. 시간대별 태그 (저녁형, 밤올빼미, 오후형, 새벽형)
  if (targetSchedule.length > 0) {
    // 주로 활동하는 시간대를 계산
    const timeSlotCounts: Record<string, number> = {
      morning: 0, // 06-12
      afternoon: 0, // 12-18
      evening: 0, // 18-24
      night: 0, // 00-06
    };

    targetSchedule.forEach((slot) => {
      const timeSlot = slot.timeSlot;
      const [startTime] = timeSlot.split('-');
      const startHour = parseInt(startTime.split(':')[0], 10);

      if (startHour >= 6 && startHour < 12) {
        timeSlotCounts.morning++;
      } else if (startHour >= 12 && startHour < 18) {
        timeSlotCounts.afternoon++;
      } else if (startHour >= 18 && startHour < 24) {
        timeSlotCounts.evening++;
      } else {
        timeSlotCounts.night++;
      }
    });

    // 가장 많은 시간대에 태그 부여 (최소 2개 이상 슬롯)
    const maxCount = Math.max(...Object.values(timeSlotCounts));
    if (maxCount >= 2) {
      if (timeSlotCounts.evening === maxCount) {
        tags.push({ label: '저녁형' });
      } else if (timeSlotCounts.night === maxCount) {
        tags.push({ label: '밤올빼미' });
      } else if (timeSlotCounts.afternoon === maxCount) {
        tags.push({ label: '오후형' });
      } else if (timeSlotCounts.morning === maxCount) {
        tags.push({ label: '새벽형' });
      }
    }
  }

  // 최소 3개 보장: 부족하면 기본 Tag 추가 (조건 없이 무조건 추가)
  // 성향 테스트를 안 한 사람도 최소 3개 태그를 가져야 함
  if (tags.length < 3) {
    // Fallback 태그 목록 (우선순위 순)
    const fallbackTags = [
      '좋은만남',      // 1순위: 새로운 만남 긍정 메시지
      '스타일유사',    // 2순위: 일반적 궁합
      '매너좋음',      // 3순위: 기본 매너
      '활동적',        // 4순위: 활동성
      '꾸준함',        // 5순위: 지속성
    ];

    // 이미 추가되지 않은 fallback 태그를 순서대로 추가
    for (const fallbackLabel of fallbackTags) {
      if (tags.length >= 3) {
        break; // 3개 이상이면 중단
      }
      // 중복 방지: 이미 있는 태그는 추가하지 않음
      if (!tags.some((t) => t.label === fallbackLabel)) {
        tags.push({ label: fallbackLabel });
      }
    }
  }

  // 상위 5개로 제한
  return tags.slice(0, 5);
};

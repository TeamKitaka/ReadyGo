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
 * 태그 중복 방지 헬퍼 함수
 * 
 * 이미 존재하는 태그가 아닌 경우에만 추가
 * 
 * @param tags - 현재 태그 배열
 * @param label - 추가할 태그 레이블
 */
function addTagIfNotExists(tags: MatchTagCoreDTO[], label: string): void {
  if (!tags.some((t) => t.label === label)) {
    tags.push({ label });
  }
}

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

  // 3. Target의 Trait 기반 태그 (구체적 성향 태그)
  // Tag는 "상대방의 특성"을 나타냄
  const viewerTraits = context.viewer.traits?.traits;
  const targetTraits = context.target.traits?.traits;
  if (targetTraits) {
    // 3-1. Target의 가장 높은 trait 찾기
    const traits = [
      { key: 'cooperation', value: targetTraits.cooperation, label: '협동형' },
      { key: 'exploration', value: targetTraits.exploration, label: '탐험형' },
      { key: 'strategy', value: targetTraits.strategy, label: '전략형' },
      { key: 'leadership', value: targetTraits.leadership, label: '리더형' },
      { key: 'social', value: targetTraits.social, label: '사교형' },
    ];
    
    // 가장 높은 trait 찾기
    const topTrait = traits.reduce((max, trait) => 
      trait.value > max.value ? trait : max
    );
    
    // Target의 특성이 명확하면 (60 이상) 태그 추가
    if (topTrait.value >= 60) {
      tags.push({ label: topTrait.label });
    }
    
    // 3-2. 상호보완적인 trait 찾기 (viewer가 낮고 target이 높은 경우)
    if (viewerTraits) {
      const complementaryTraits = traits.filter(trait => {
        const viewerValue = viewerTraits[trait.key as keyof typeof viewerTraits];
        const targetValue = trait.value;
        // viewer가 50 이하이고, target이 70 이상이면 상호보완적
        return viewerValue <= 50 && targetValue >= 70;
      });
      
      // 상호보완적인 trait가 있으면 태그 추가
      if (complementaryTraits.length > 0) {
        tags.push({ label: '보완궁합' });
      }
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
  // 조건 완화: reliabilityScore >= 70 → >= 40 (성향 불필요, 행동 기반)
  const reliabilityScore = context.target.reliability?.reliabilityScore;
  if (reliabilityScore !== undefined && reliabilityScore >= 40) {
    addTagIfNotExists(tags, '매너좋음');
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
  // 조건 완화: partyCount >= 20 → >= 10 (성향 불필요, 행동 기반)
  // targetPartyCount는 위에서 이미 정의됨 (line 165)
  if (targetPartyCount !== undefined && targetPartyCount >= 10) {
    tags.push({ label: '파티러버' });
  }

  // 10. 베테랑 (높은 신뢰도 + 많은 파티 경험)
  // 조건 완화: reliabilityScore >= 80 & partyCount >= 30
  //          → reliabilityScore >= 70 & partyCount >= 20
  if (
    reliabilityScore !== undefined &&
    reliabilityScore >= 70 &&
    targetPartyCount !== undefined &&
    targetPartyCount >= 20
  ) {
    tags.push({ label: '베테랑' });
  }

  // 11. 활동적 (플레이 시간대가 있음)
  // 조건 완화: 4개 이상 → 2개 이상 (성향 테스트 없는 유저도 받을 수 있도록)
  if (targetSchedule.length >= 2) {
    addTagIfNotExists(tags, '활동적');
  }

  // 12. 꾸준함 (신뢰도 데이터 존재 또는 파티 경험 존재)
  // 조건 완화: reliabilityScore >= 50 → 데이터만 있으면 OK (성향 불필요)
  // 또는 파티 경험이 5개 이상이면 꾸준함으로 인정
  const hasReliabilityData = reliabilityScore !== undefined && reliabilityScore > 0;
  const hasPartyExperience = targetPartyCount !== undefined && targetPartyCount >= 5;
  if (hasReliabilityData || hasPartyExperience) {
    addTagIfNotExists(tags, '꾸준함');
  }

  // 13-14. 협동형, 전략형, 리더형, 사교형 태그는 Line 125-147에서 topTrait 로직으로 이미 처리됨
  // 중복 방지를 위해 개별 trait 체크 로직 제거
  // (이전에는 여기서 다시 추가하여 같은 태그가 2개씩 생성되는 문제가 있었음)

  // 15. 집중형 (긴 세션 플레이 - Steam totalPlayTime이 많은 경우)
  if (targetSteam && targetSteam.totalPlayTime && targetSteam.totalPlayTime >= 1000) {
    tags.push({ label: '집중형' });
  }

  // 16. 시간대별 태그 (아침형, 저녁형, 올빼미형, 유연형, 주말형)
  if (targetSchedule.length > 0) {
    // 시간대와 dayType 분석
    const timeSlotCounts: Record<string, number> = {
      morning: 0,    // 06-12 (아침형)
      afternoon: 0,  // 12-18 (오후형)
      evening: 0,    // 18-22 (저녁형)
      lateNight: 0,  // 22-04 (올빼미형)
    };
    
    let weekdayCount = 0;
    let weekendCount = 0;

    targetSchedule.forEach((slot) => {
      const timeSlot = slot.timeSlot;
      const [startTime] = timeSlot.split('-');
      const startHour = parseInt(startTime.split(':')[0], 10);

      // 시간대 카운트
      if (startHour >= 6 && startHour < 12) {
        timeSlotCounts.morning++;
      } else if (startHour >= 12 && startHour < 18) {
        timeSlotCounts.afternoon++;
      } else if (startHour >= 18 && startHour < 22) {
        timeSlotCounts.evening++;
      } else if (startHour >= 22 || startHour < 4) {
        // 22-24시 또는 00-04시
        timeSlotCounts.lateNight++;
      }
      
      // 요일 카운트
      if (slot.dayType === 'weekend') {
        weekendCount++;
      } else if (slot.dayType === 'weekday') {
        weekdayCount++;
      }
    });

    // 16-1. 주말형 (weekend 비중이 높음)
    if (weekendCount > 0 && weekendCount >= weekdayCount * 1.5) {
      tags.push({ label: '주말형' });
    }

    // 16-2. 유연형 (시간대가 다양하고 고른 분포)
    const totalSlots = targetSchedule.length;
    const nonZeroCounts = Object.values(timeSlotCounts).filter(c => c > 0).length;
    const maxTimeCount = Math.max(...Object.values(timeSlotCounts));
    
    // 4개 이상 시간대 + 특정 시간대 집중도가 낮음 (50% 미만)
    if (totalSlots >= 4 && nonZeroCounts >= 3 && maxTimeCount / totalSlots < 0.5) {
      tags.push({ label: '유연형' });
    }
    // 16-3. 특정 시간대형 (가장 많은 시간대, 최소 1개 이상)
    // Cold Start 대응: 행동 기반이므로 schedule만 있으면 태그 생성
    else {
      const maxCount = Math.max(...Object.values(timeSlotCounts));
      if (maxCount >= 1) {
        if (timeSlotCounts.lateNight === maxCount) {
          tags.push({ label: '올빼미형' });
        } else if (timeSlotCounts.evening === maxCount) {
          tags.push({ label: '저녁형' });
        } else if (timeSlotCounts.afternoon === maxCount) {
          tags.push({ label: '오후형' });
        } else if (timeSlotCounts.morning === maxCount) {
          tags.push({ label: '아침형' });
        }
      }
    }
  }

  // 최소 3개 보장: 부족하면 기본 Tag 추가 (조건 없이 무조건 추가)
  // 성향 테스트를 안 한 사람도 최소 3개 태그를 가져야 함
  // Fallback 태그는 조건 없이 추가 가능한 "일반적 긍정 메시지"만 포함
  if (tags.length < 3) {
    // Fallback 태그 후보 목록 (랜덤 선택용)
    // 조건 없이 추가 가능한 일반적/긍정적 태그만
    const fallbackCandidates = [
      '좋은만남',      // 새로운 만남 긍정 메시지
      '매너좋음',      // 기본 매너 (긍정 이미지)
      '활동적',        // 활동성 (일반적 표현)
      '꾸준함',        // 지속성 (긍정 신호)
      '협동형',        // 기본 성향 (구체적)
    ];

    // 이미 추가되지 않은 태그만 필터링
    const availableTags = fallbackCandidates.filter(
      (label) => !tags.some((t) => t.label === label)
    );

    // 필요한 개수만큼 랜덤 선택
    const needed = 3 - tags.length;
    const shuffled = availableTags.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, needed);

    // 선택된 태그 추가
    selected.forEach((label) => {
      tags.push({ label });
    });
  }

  // 상위 5개로 제한
  return tags.slice(0, 5);
};

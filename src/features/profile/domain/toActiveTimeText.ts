/**
 * 📌 Domain Layer - Schedule to Active Time Text Converter
 *
 * - 순수 함수: 외부 상태(useState, hook, fetch, console 등)에 의존하지 않음
 * - 입력 → 출력이 명확한 변환 함수
 * - UI 레이어와 분리
 * - i18n / 번역 키 처리 미포함
 */

import type { ProfileCoreDTO } from '@/commons/types/profile/profileCore.dto';

/**
 * timeSlot 문자열을 인덱스로 변환
 * dawn → 0, morning → 1, afternoon → 2, evening → 3
 */
const timeSlotToIndex = (timeSlot: string): number | null => {
  const indexMap: Record<string, number> = {
    dawn: 0,
    morning: 1,
    afternoon: 2,
    evening: 3,
  };
  return indexMap[timeSlot.toLowerCase()] ?? null;
};

/**
 * 시간대 인덱스 배열을 패턴 분석하여 라벨로 변환
 * - {0,1,2,3} → 종일형
 * - {0,1} → 새벽·오전형
 * - {2,3} → 오후·야간형
 * - {1,2} → 주간형
 * - 비연속 (예: {0,2}, {1,3}) → 유동형
 */
const analyzeTimePattern = (indices: number[]): string => {
  if (indices.length === 0) {
    return '';
  }

  // 정렬된 인덱스 집합
  const sortedIndices = [...new Set(indices)].sort((a, b) => a - b);
  const indexSet = new Set(sortedIndices);

  // 종일형: 모든 시간대 포함
  if (indexSet.size === 4 && indexSet.has(0) && indexSet.has(1) && indexSet.has(2) && indexSet.has(3)) {
    return '종일형';
  }

  // 새벽·오전형: {0,1}
  if (indexSet.size === 2 && indexSet.has(0) && indexSet.has(1)) {
    return '새벽·오전형';
  }

  // 오후·야간형: {2,3}
  if (indexSet.size === 2 && indexSet.has(2) && indexSet.has(3)) {
    return '오후·야간형';
  }

  // 주간형: {1,2}
  if (indexSet.size === 2 && indexSet.has(1) && indexSet.has(2)) {
    return '주간형';
  }

  // 비연속 패턴 (유동형)
  // 연속된 인덱스가 아닌 경우
  let isConsecutive = true;
  for (let i = 0; i < sortedIndices.length - 1; i++) {
    if (sortedIndices[i + 1] - sortedIndices[i] !== 1) {
      isConsecutive = false;
      break;
    }
  }

  // 단일 시간대도 연속으로 간주 (예: {0}, {1}, {2}, {3})
  if (sortedIndices.length === 1) {
    isConsecutive = true;
  }

  // 연속되지 않으면 유동형
  if (!isConsecutive) {
    return '유동형';
  }

  // 그 외의 연속 패턴 (예: {0,1,2}, {1,2,3})도 유동형으로 처리
  return '유동형';
};

/**
 * ProfileCoreDTO의 schedule을 패턴 분석 기반 라벨로 변환
 *
 * @param schedule - ProfileCoreDTO['schedule'] (PlayScheduleItem[] | undefined)
 * @returns string | undefined - "종일형", "새벽·오전형", "오후·야간형", "주간형", "유동형" 중 하나
 *
 * @example
 * ```typescript
 * const profile: ProfileCoreDTO = {
 *   userId: 'uuid-1234',
 *   schedule: [
 *     { dayType: 'weekday', timeSlot: 'evening' },
 *     { dayType: 'weekend', timeSlot: 'dawn' }
 *   ]
 * };
 *
 * const text = toActiveTimeText(profile.schedule);
 * // "유동형" (evening=3, dawn=0, 비연속)
 * ```
 *
 * @example
 * ```typescript
 * // schedule이 없는 경우
 * const noSchedule = toActiveTimeText(undefined); // undefined
 * ```
 *
 * @example
 * ```typescript
 * // 빈 schedule 배열인 경우
 * const emptySchedule = toActiveTimeText([]); // undefined
 * ```
 */
export const toActiveTimeText = (
  schedule: ProfileCoreDTO['schedule']
): string | undefined => {
  // schedule이 undefined인 경우 → undefined 반환
  if (!schedule) {
    return undefined;
  }

  // 빈 배열인 경우 → undefined 반환
  if (schedule.length === 0) {
    return undefined;
  }

  // timeSlots 추출 (중복 제거)
  const timeSlots: string[] = [];
  for (const item of schedule) {
    if (!timeSlots.includes(item.timeSlot)) {
      timeSlots.push(item.timeSlot);
    }
  }

  // timeSlot을 인덱스로 변환
  const indices = timeSlots
    .map(timeSlotToIndex)
    .filter((idx): idx is number => idx !== null);

  if (indices.length === 0) {
    return undefined;
  }

  // 패턴 분석하여 라벨 반환
  return analyzeTimePattern(indices);
};

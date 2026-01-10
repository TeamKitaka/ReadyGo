/**
 * 스케줄 질문 타입 정의
 */
export interface ScheduleQuestion {
  id: string;
  type: 'schedule';
  text: string;
  dayTypes: DayType[];
  timeSlots: TimeSlot[];
}

export interface DayType {
  id: string;
  label: string;
}

export interface TimeSlot {
  id: string;
  label: string;
}

/**
 * 요일 타입
 */
export const DAY_TYPES: DayType[] = [
  { id: 'weekday', label: '평일' },
  { id: 'weekend', label: '주말' },
];

/**
 * 시간대
 */
export const TIME_SLOTS: TimeSlot[] = [
  { id: 'dawn', label: '새벽 (00:00-06:00)' },
  { id: 'morning', label: '아침 (06:00-12:00)' },
  { id: 'afternoon', label: '오후 (12:00-18:00)' },
  { id: 'evening', label: '저녁 (18:00-24:00)' },
];

/**
 * 스케줄 질문 (항상 마지막에 고정)
 */
export const SCHEDULE_QUESTION: ScheduleQuestion = {
  id: 'Q_SCHEDULE',
  type: 'schedule',
  text: '주로 게임 플레이하는 시간대는?',
  dayTypes: DAY_TYPES,
  timeSlots: TIME_SLOTS,
};

/**
 * start_date와 start_time을 조합하여 start_at timestamptz를 계산
 * @param startDate YYYY-MM-DD 형식의 날짜 문자열
 * @param startTime HH:mm:ss 형식의 시간 문자열
 * @returns ISO 8601 형식의 timestamptz 문자열
 */
export const calculateStartAt = (
  startDate: string,
  startTime: string
): string => {
  // start_date와 start_time을 조합하여 timestamptz 생성
  const dateTimeString = `${startDate}T${startTime}`;
  const date = new Date(dateTimeString);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date/time: ${dateTimeString}`);
  }

  return date.toISOString();
};

/**
 * useMatchList Hook
 *
 * 책임:
 * - 매칭 화면용 매칭 목록 조회
 * - 필터 옵션 관리 (minScore, statusFilter)
 * - refetch 기능 제공
 *
 * 비책임:
 * - API 구현 (API Route에서 처리)
 * - 비즈니스 로직 (Service에서 처리)
 *
 * 특징:
 * - 셀렉트박스 변경 시 자동 refetch 없음
 * - 명시적으로 refetch(options) 호출 시에만 서버 요청
 */

import { useState, useEffect, useCallback } from 'react';

export interface MatchListOptions {
  minScore?: number;
  statusFilter?: 'all' | 'online' | 'offline';
  refresh?: boolean; // 강제 새로고침 (캐시 스킵)
}

/**
 * 매칭 화면용 매칭 목록 조회 Hook
 *
 * @returns 매칭 결과, 로딩 상태, 에러, 현재 필터, refetch 함수
 */
export const useMatchList = () => {
  const [filters, setFilters] = useState<MatchListOptions>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMatchList = useCallback(async (options: MatchListOptions) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.minScore) {
        params.set('minScore', String(options.minScore));
      }
      if (options.statusFilter) {
        params.set('status', options.statusFilter);
      }
      if (options.refresh) {
        params.set('refresh', 'true');
      }

      const response = await fetch(`/api/match/list?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || []);
      setFilters(options); // 성공 시 filters 업데이트
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 마운트 시에만 fetch (기본 필터)
  useEffect(() => {
    fetchMatchList({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refetch 함수는 options를 받음
  const refetch = useCallback(
    (options: MatchListOptions) => {
      fetchMatchList(options);
    },
    [fetchMatchList]
  );

  return {
    results,
    loading,
    error,
    filters, // 현재 적용된 필터
    refetch, // refetch(newOptions)
  };
};

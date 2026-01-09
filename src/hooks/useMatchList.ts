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
 */

import { useState, useEffect, useCallback } from 'react';

export interface MatchListOptions {
  minScore?: number;
  statusFilter?: 'all' | 'online' | 'offline';
}

/**
 * 매칭 화면용 매칭 목록 조회 Hook
 * 
 * @param options 필터 옵션
 * @returns 매칭 결과, 로딩 상태, 에러, refetch 함수
 */
export const useMatchList = (options: MatchListOptions = {}) => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchMatchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (options.minScore) params.set('minScore', String(options.minScore));
      if (options.statusFilter) params.set('status', options.statusFilter);
      
      const response = await fetch(`/api/match/list?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [options.minScore, options.statusFilter]);
  
  useEffect(() => {
    fetchMatchList();
  }, [fetchMatchList]);
  
  return {
    results,
    loading,
    error,
    refetch: fetchMatchList,
  };
};


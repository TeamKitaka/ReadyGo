/**
 * useHomeMatches Hook
 * 
 * 책임:
 * - 홈 화면 매칭 데이터 fetch
 * - loading/error 상태 관리
 * - API 응답 → MatchCardProps 변환
 * 
 * 비책임:
 * - 비즈니스 로직 (Service에서 처리)
 * - 데이터 캐싱 (API/Service에서 처리)
 */

import { useState, useEffect } from 'react';
import { useProfile } from './useProfile';
import { toMatchCardProps } from '../utils/toMatchCardProps';
import type { MatchCardProps } from '../ui/match-section/card/matchCard';
import { AnimalType } from '@/commons/constants/animal/animal.enum';

/**
 * 홈 화면 매칭 데이터 Hook
 * 
 * 동작:
 * 1. 현재 사용자 프로필 로드 대기
 * 2. animalType 체크 (Cold Start 스킵) ✨
 * 3. userId 있으면 매칭 API 호출
 * 4. 응답을 MatchCardProps로 변환
 * 
 * @returns 매칭 카드 배열, 로딩 상태, 에러
 */
export const useHomeMatches = () => {
  const { data: profileViewModel } = useProfile();
  const [matchCards, setMatchCards] = useState<MatchCardProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 프로필 없으면 대기
    if (!profileViewModel?.userId) {
      setMatchCards([]);
      return;
    }

    // 🎯 Cold Start 체크: unknown이면 API 스킵 (성능 개선)
    if (
      !profileViewModel.animalType ||
      profileViewModel.animalType === AnimalType.unknown
    ) {
      setMatchCards([]);
      setLoading(false);
      return;
    }

    const fetchMatches = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/match/results', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // API 응답을 MatchCardProps로 변환
        const cards = (data.results || []).map(toMatchCardProps);
        
        setMatchCards(cards);
      } catch (err) {
        console.error('[useHomeMatches] Error fetching matches:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setMatchCards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [profileViewModel?.userId, profileViewModel?.animalType]);

  return { matchCards, loading, error };
};


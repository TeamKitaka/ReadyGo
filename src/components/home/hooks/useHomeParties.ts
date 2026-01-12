import { useState, useEffect } from 'react';
import type { PartyCardProps } from '@/components/home/ui/party-section/card/partyCard';

/**
 * 홈 화면용 파티 목록 조회 Hook
 *
 * 📌 기능:
 * - 시작 시간이 임박하고 인원 미달인 파티 목록 조회
 * - 현재 사용자가 참여하지 않은 파티만 필터링
 * - 최대 6개 반환
 *
 * @returns parties - 파티 카드 데이터 배열
 * @returns loading - 로딩 상태
 * @returns error - 에러 객체
 */
export const useHomeParties = () => {
  const [parties, setParties] = useState<PartyCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchParties = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[useHomeParties] Fetching parties from API...');

        // API 호출하여 파티 목록 조회
        const response = await fetch('/api/home/parties');

        console.log('[useHomeParties] API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[useHomeParties] API error response:', errorText);
          throw new Error(`Failed to fetch parties: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[useHomeParties] API response data:', data);

        if (data.error) {
          throw new Error(data.message || data.error);
        }

        console.log('[useHomeParties] Setting parties:', data.parties);
        setParties(data.parties || []);
      } catch (err) {
        console.error('[useHomeParties] Error fetching parties:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setParties([]);
      } finally {
        setLoading(false);
      }
    };

    // 초기 로드
    fetchParties();

    // 페이지가 다시 보일 때 (뒤로가기, 탭 전환 등)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useHomeParties] Page visible, refetching...');
        fetchParties();
      }
    };

    // 윈도우 포커스 시 (다른 앱에서 돌아올 때)
    const handleFocus = () => {
      console.log('[useHomeParties] Window focused, refetching...');
      fetchParties();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return { parties, loading, error };
};


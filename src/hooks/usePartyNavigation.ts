import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * 파티 페이지 네비게이션을 위한 hook
 */
export const usePartyNavigation = () => {
  const router = useRouter();

  /**
   * 파티 상세 페이지로 이동
   * @param postId - 파티 게시글 ID
   */
  const navigateToPartyDetail = useCallback(
    (postId: string | number) => {
      router.push(`/party/${postId}`);
    },
    [router]
  );

  return {
    navigateToPartyDetail,
  };
};


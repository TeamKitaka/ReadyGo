import { usePathname } from 'next/navigation';
import { getUrlMetadata, URL_PATHS } from '@/commons/constants/url';
import { useAuth } from '@/commons/providers/auth/auth.provider';

export const useLayoutVisibility = () => {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const urlMetadata = getUrlMetadata(pathname);

  // /home 비로그인 상태에서는 레이아웃 헤더/사이드바를 숨기고
  // 랜딩 페이지가 전체 화면을 사용하도록 한다.
  if (pathname === URL_PATHS.HOME && !isLoggedIn) {
    return {
      showSidebar: false,
      showHeader: false,
    };
  }

  return {
    showSidebar: urlMetadata?.visibility.sidebar ?? false,
    showHeader: urlMetadata?.visibility.header ?? false,
  };
};

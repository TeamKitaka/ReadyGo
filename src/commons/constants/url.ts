/**
 * URL 경로 관리
 * 모든 URL 경로를 한 곳에서 관리하며, 다이나믹 라우팅을 지원합니다.
 * Next.js Link 컴포넌트에서 사용할 수 있도록 설계되었습니다.
 */

// ============================================
// Type Definitions
// ============================================

/**
 * 접근 가능 상태 타입
 */
export type AccessStatus = 'public' | 'member-only';

/**
 * 노출 가능 목록 타입
 */
export interface VisibilityConfig {
  header: boolean;
  sidebar: boolean;
}

/**
 * URL 경로 메타데이터
 */
export interface UrlMetadata {
  path: string;
  accessStatus: AccessStatus;
  visibility: VisibilityConfig;
}

// ============================================
// URL Path Constants
// ============================================

/**
 * 기본 경로 상수
 */
export const URL_PATHS = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  SIGNUP_SUCCESS: '/signup-success',
  HOME: '/home',
  CHAT: '/chat',
  MATCH: '/match',
  PARTY: '/party',
  PARTY_NEW: '/party/new',
  // FRIENDS와 NOTIFICATIONS는 이제 상태 관리로 처리 (URL 라우트 아님)
  TRAITS: '/traits',
  TRAITS_RESULT: '/traits/result',
  STEAM_CALLBACK: '/steam/callback',
} as const;

// ============================================
// URL Metadata
// ============================================

/**
 * URL 경로 메타데이터 맵
 */
export const URL_METADATA: Record<string, UrlMetadata> = {
  [URL_PATHS.LOGIN]: {
    path: URL_PATHS.LOGIN,
    accessStatus: 'public',
    visibility: {
      header: false,
      sidebar: false,
    },
  },
  [URL_PATHS.SIGNUP]: {
    path: URL_PATHS.SIGNUP,
    accessStatus: 'public',
    visibility: {
      header: false,
      sidebar: false,
    },
  },
  [URL_PATHS.SIGNUP_SUCCESS]: {
    path: URL_PATHS.SIGNUP_SUCCESS,
    accessStatus: 'public',
    visibility: {
      header: false,
      sidebar: false,
    },
  },
  [URL_PATHS.HOME]: {
    path: URL_PATHS.HOME,
    accessStatus: 'public',
    visibility: {
      header: true,
      sidebar: true,
    },
  },
  [URL_PATHS.CHAT]: {
    path: URL_PATHS.CHAT,
    accessStatus: 'member-only',
    visibility: {
      header: true,
      sidebar: true,
    },
  },
  [URL_PATHS.MATCH]: {
    path: URL_PATHS.MATCH,
    accessStatus: 'member-only',
    visibility: {
      header: true,
      sidebar: true,
    },
  },
  [URL_PATHS.PARTY]: {
    path: URL_PATHS.PARTY,
    accessStatus: 'member-only',
    visibility: {
      header: true,
      sidebar: true,
    },
  },
  [URL_PATHS.PARTY_NEW]: {
    path: URL_PATHS.PARTY_NEW,
    accessStatus: 'member-only',
    visibility: {
      header: true,
      sidebar: true,
    },
  },
  [URL_PATHS.TRAITS]: {
    path: URL_PATHS.TRAITS,
    accessStatus: 'member-only',
    visibility: {
      header: false,
      sidebar: false,
    },
  },
  [URL_PATHS.TRAITS_RESULT]: {
    path: URL_PATHS.TRAITS_RESULT,
    accessStatus: 'member-only',
    visibility: {
      header: false,
      sidebar: false,
    },
  },
  [URL_PATHS.STEAM_CALLBACK]: {
    path: URL_PATHS.STEAM_CALLBACK,
    accessStatus: 'public',
    visibility: {
      header: false,
      sidebar: false,
    },
  },
};

// ============================================
// Dynamic Routing Functions
// ============================================

/**
 * 채팅방 URL 생성
 * @param roomId - 채팅방 ID
 * @returns 채팅방 경로
 * @example
 * getChatRoomUrl('123') // '/chat/123'
 */
export const getChatRoomUrl = (roomId: string | number): string => {
  return `/chat/${roomId}`;
};

/**
 * 파티 상세 URL 생성
 * @param postId - 파티 게시글 ID
 * @returns 파티 상세 경로
 * @example
 * getPartyDetailUrl('456') // '/party/456'
 */
export const getPartyDetailUrl = (postId: string | number): string => {
  return `/party/${postId}`;
};

// ============================================
// Utility Functions
// ============================================

/**
 * URL 메타데이터 조회 함수
 * @param path - URL 경로
 * @returns URL 메타데이터 또는 undefined
 */
export const getUrlMetadata = (path: string): UrlMetadata | undefined => {
  // 정확한 경로 매칭
  if (URL_METADATA[path]) {
    return URL_METADATA[path];
  }

  // 다이나믹 라우팅 경로 처리
  if (path.startsWith('/chat/')) {
    return {
      path,
      accessStatus: 'member-only',
      visibility: {
        header: true,
        sidebar: true,
      },
    };
  }

  if (path.startsWith('/party/') && path !== URL_PATHS.PARTY_NEW) {
    return {
      path,
      accessStatus: 'member-only',
      visibility: {
        header: true,
        sidebar: true,
      },
    };
  }

  if (path.startsWith('/traits/result')) {
    return {
      path,
      accessStatus: 'member-only',
      visibility: {
        header: false,
        sidebar: false,
      },
    };
  }

  // 테스트 페이지 경로 처리 (/temp, /temp2 등)
  if (path.startsWith('/temp')) {
    return {
      path,
      accessStatus: 'public',
      visibility: {
        header: false,
        sidebar: false,
      },
    };
  }

  return undefined;
};

/**
 * 헤더에 노출 가능한 경로 목록 조회
 * @returns 헤더에 노출 가능한 경로 배열
 */
export const getHeaderVisiblePaths = (): string[] => {
  return Object.values(URL_METADATA)
    .filter((metadata) => metadata.visibility.header)
    .map((metadata) => metadata.path);
};

/**
 * 사이드바에 노출 가능한 경로 목록 조회
 * @returns 사이드바에 노출 가능한 경로 배열
 */
export const getSidebarVisiblePaths = (): string[] => {
  return Object.values(URL_METADATA)
    .filter((metadata) => metadata.visibility.sidebar)
    .map((metadata) => metadata.path);
};

/**
 * 회원 전용 경로인지 확인
 * @param path - URL 경로
 * @returns 회원 전용 여부
 */
export const isMemberOnlyPath = (path: string): boolean => {
  const metadata = getUrlMetadata(path);
  return metadata?.accessStatus === 'member-only';
};

/**
 * 공개 경로인지 확인
 * @param path - URL 경로
 * @returns 공개 경로 여부
 */
export const isPublicPath = (path: string): boolean => {
  const metadata = getUrlMetadata(path);
  return metadata?.accessStatus === 'public';
};

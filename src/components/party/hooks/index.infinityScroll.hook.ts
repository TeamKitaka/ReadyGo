'use client';

import { useState, useCallback, useEffect } from 'react';
import { PartyCardProps } from '../ui/card/card';
import { AnimalType } from '@/commons/constants/animal';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import { SortOption } from './index.sort.hook';

// API 응답 타입
interface PartyPost {
  id: number;
  creator_id: string;
  game_title: string;
  party_title: string;
  start_date: string;
  start_time: string;
  description: string;
  max_members: number;
  control_level: string;
  difficulty: string;
  voice_chat: string | null;
  tags: string[] | null;
  status: string;
  created_at: string;
}

// 실제 데이터 타입
interface PartyMember {
  post_id: number;
  user_id: string;
  role: string;
  joined_at: string;
}

interface UserProfile {
  id: string;
  animal_type: string | null;
}

interface UseInfinitePartyListReturn {
  data: PartyCardProps[];
  hasMore: boolean;
  loadMore: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

// 상수 정의
const INITIAL_LIMIT = 10;
const SCROLL_LIMIT = 10;

// 날짜와 시간을 조합하여 "MM/DD 오전/오후/새벽 HH:mm" 형식으로 변환
// - 날짜 형식: YYYY-MM-DD → MM/DD
// - 시간 형식: HH:mm:ss → "오전/오후/새벽 HH:mm"
// - 예: start_date="2024-12-25", start_time="18:30:00" → "12/25 오후 6:30"
// - 예: start_date="2024-12-26", start_time="02:00:00" → "12/26 새벽 2:00"
const formatDateTime = (dateString: string, timeString: string): string => {
  const dateMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) {
    return `${dateString} ${timeString}`;
  }
  const [, , month, day] = dateMatch;
  const formattedDate = `${month}/${day}`;

  const timeMatch = timeString.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (!timeMatch) {
    return `${formattedDate} ${timeString}`;
  }

  const [, hourStr, minuteStr] = timeMatch;
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr;

  // 새벽/오전/오후 처리
  let period: string;
  let displayHour: number;

  if (hour >= 0 && hour < 6) {
    // 새벽 (0시~5시)
    period = '새벽';
    displayHour = hour === 0 ? 12 : hour;
  } else if (hour < 12) {
    // 오전 (6시~11시)
    period = '오전';
    displayHour = hour;
  } else {
    // 오후 (12시~23시)
    period = '오후';
    displayHour = hour === 12 ? 12 : hour - 12;
  }

  return `${formattedDate} ${period} ${displayHour.toString().padStart(2, '0')}:${minute}`;
};

// voice_chat 값을 한글로 변환: 'required' → "필수 사용", 'optional' → "선택 사용", null → "선택 사용" (기본값)
const getVoiceChatLabel = (voiceChat: string | null): string => {
  if (voiceChat === 'required') {
    return '필수 사용';
  }
  if (voiceChat === 'optional') {
    return '선택 사용';
  }
  // null인 경우 기본값
  return '선택 사용';
};

// difficulty 값을 한글로 변환
const getDifficultyLabel = (difficulty: string): string => {
  const difficultyMap: Record<string, string> = {
    undefined: '미정',
    flexible: '유동',
    easy: '이지',
    normal: '노멀',
    hard: '하드',
    hell: '지옥',
  };
  return difficultyMap[difficulty] || difficulty;
};

// control_level 값을 한글로 변환
const getControlLevelLabel = (controlLevel: string): string => {
  const controlLevelMap: Record<string, string> = {
    beginner: '미숙',
    intermediate: '반숙',
    advanced: '완숙',
    expert: '빡숙',
    master: '장인',
  };
  return controlLevelMap[controlLevel] || controlLevel;
};

// animal_type 값을 아바타 아이콘 파일명으로 변환
// animal_type 값은 AnimalType enum 값이며, 이를 아바타 아이콘 파일명으로 변환
const getAnimalTypeFromProfile = (animalType: string | null): string => {
  if (!animalType) {
    return 'default';
  }
  // AnimalType enum 값과 일치하는지 확인
  const validAnimalTypes: string[] = Object.values(AnimalType);
  if (validAnimalTypes.includes(animalType)) {
    return animalType;
  }
  return 'default';
};

// API 응답의 members와 profiles를 Map으로 변환하여 빠른 조회가 가능하도록 처리
const createMembersAndProfilesMaps = (
  members: PartyMember[],
  profiles: UserProfile[]
): {
  membersMap: Map<number, PartyMember[]>;
  profilesMap: Map<string, UserProfile>;
} => {
  const membersMap = new Map<number, PartyMember[]>();
  const profilesMap = new Map<string, UserProfile>();

  // members 배열을 post_id를 키로 하는 Map으로 변환
  for (const member of members) {
    const postId = member.post_id;
    if (postId) {
      if (!membersMap.has(postId)) {
        membersMap.set(postId, []);
      }
      membersMap.get(postId)!.push(member);
    }
  }

  // profiles 배열을 user_id(id)를 키로 하는 Map으로 변환
  for (const profile of profiles) {
    if (profile.id) {
      profilesMap.set(profile.id, profile);
    }
  }

  return { membersMap, profilesMap };
};

// memberAvatars 생성 (API 응답의 members와 profiles 사용)
// - API 응답의 members 배열을 post_id별로 그룹화하여 Map으로 변환
// - API 응답의 profiles 배열을 user_id를 키로 하는 Map으로 변환
// - members에서 해당 post_id의 멤버들을 찾고, 각 멤버의 user_id로 profiles에서 animal_type을 조회
// - animal_type을 getAnimalTypeFromProfile 함수를 통해 아바타 아이콘 파일명으로 변환
// - 최대 4개까지 아바타를 반환
const getMemberAvatars = (
  postId: number,
  membersMap: Map<number, PartyMember[]>,
  profilesMap: Map<string, UserProfile>
): string[] => {
  const members = membersMap.get(postId) || [];
  const avatars = members.slice(0, 4).map((member) => {
    const profile = profilesMap.get(member.user_id);
    return getAnimalTypeFromProfile(profile?.animal_type || null);
  });
  return avatars;
};

// currentMembers 계산 (API 응답의 members 사용)
// - API 응답의 members 배열에서 해당 post_id의 멤버 개수를 계산
const getCurrentMembers = (
  postId: number,
  membersMap: Map<number, PartyMember[]>
): number => {
  return membersMap.get(postId)?.length || 0;
};

// description이 카드 사이즈를 넘어가는 경우 "..."으로 표현
const truncateDescription = (
  description: string,
  maxLength: number = 100
): string => {
  if (description.length <= maxLength) {
    return description;
  }
  return `${description.substring(0, maxLength)}...`;
};

// 날짜와 시간을 정확하게 파싱하여 Date 객체를 생성하는 헬퍼 함수
// startDate: "YYYY-MM-DD" 형식
// startTime: "HH:mm:ss" 형식
// ISO 형식(YYYY-MM-DDTHH:mm:ss)으로 변환하여 정확한 날짜/시간 비교 가능
const parseStartDateTime = (
  startDate: string | undefined,
  startTime: string | undefined
): Date | null => {
  if (!startDate || !startTime) {
    return null;
  }
  try {
    // ISO 형식으로 변환: "YYYY-MM-DD HH:mm:ss" → "YYYY-MM-DDTHH:mm:ss"
    const isoString = `${startDate}T${startTime}`;
    const date = new Date(isoString);
    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
};

// 파티 목록 활성/만료 분리 함수
const sortPartyList = (
  parties: PartyCardProps[],
  _sortOption: SortOption
): PartyCardProps[] => {
  const now = new Date();

  // 최신순/마감임박순 정렬 시: 시작시간이 지난 게시글 완전히 제외
  // 서버에서 이미 필터링 및 정렬이 완료되었으므로, 클라이언트에서는 추가 필터링만 수행
  return parties.filter((p) => {
    const startDateTime = parseStartDateTime(p.startDate, p.startTime);
    if (!startDateTime) {
      // 날짜/시간 정보가 없거나 파싱 실패 시 제외
      return false;
    }
    // 시작시간이 현재 시각 이후(또는 같음)인 것만 표시
    // 현재 시각이 15시라면 15시 이전의 글은 제외, 15시 이후(또는 15시 정각)만 표시
    return startDateTime >= now;
  });
};

export const useInfinitePartyList = (
  genre?: string,
  search?: string,
  tab?: 'all' | 'participating',
  sort?: SortOption
): UseInfinitePartyListReturn => {
  const { user } = useAuth();
  const [data, setData] = useState<PartyCardProps[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // 원본 파티 데이터 저장 (user 변경 시 isLeader 재계산용)
  const [originalPartyData, setOriginalPartyData] = useState<PartyPost[]>([]);

  // 데이터 변환 함수 (API 응답의 members와 profiles 사용)
  const transformPartyData = useCallback(
    (
      partyList: PartyPost[],
      members: PartyMember[],
      profiles: UserProfile[]
    ): PartyCardProps[] => {
      if (partyList.length === 0) {
        return [];
      }

      // API 응답의 members와 profiles를 Map으로 변환하여 빠른 조회가 가능하도록 처리
      const { membersMap, profilesMap } = createMembersAndProfilesMaps(
        members,
        profiles
      );

      return partyList.map((party) => {
        // memberAvatars 생성 (API 응답의 members와 profiles 사용)
        const memberAvatars = getMemberAvatars(
          party.id,
          membersMap,
          profilesMap
        );

        // currentMembers 계산 (API 응답의 members 사용)
        const currentMembers = getCurrentMembers(party.id, membersMap);

        // isLeader 계산: 로그인한 유저의 ID와 party_posts.creator_id가 같을 때만 true
        // 로그인하지 않은 경우(user가 null인 경우) 또는 creator_id가 없는 경우 false
        const isLeader = Boolean(
          user?.id && party.creator_id && user.id === party.creator_id
        );

        // 참가 여부 계산: members 배열에서 현재 사용자가 포함되어 있는지 확인
        const partyMembers = membersMap.get(party.id) || [];
        const isParticipant = Boolean(
          user?.id && partyMembers.some((member) => member.user_id === user.id)
        );

        return {
          title: party.party_title,
          description: truncateDescription(party.description),
          gameTag: party.game_title,
          memberAvatars,
          currentMembers,
          maxMembers: party.max_members,
          categories: {
            startTime: formatDateTime(party.start_date, party.start_time),
            voiceChat: getVoiceChatLabel(party.voice_chat),
            difficulty: getDifficultyLabel(party.difficulty),
            controlLevel: getControlLevelLabel(party.control_level),
          },
          partyId: party.id,
          isLeader,
          startDate: party.start_date,
          startTime: party.start_time,
          createdAt: party.created_at,
          isParticipant,
        };
      });
    },
    [user]
  );

  // 필터 변경 시 리셋
  useEffect(() => {
    // 필터가 변경되면 데이터 리셋 및 재로드
    setData([]);
    setOriginalPartyData([]);
    setHasMore(true);
    setError(null);
    setOffset(0);
    setIsInitialLoad(true);
    setIsLoading(true);
    setIsLoadingMore(false);
  }, [genre, search, tab, sort]);

  // user 변경 시 기존 데이터의 isLeader 값 재계산
  useEffect(() => {
    if (originalPartyData.length === 0) {
      return;
    }

    // 원본 데이터를 partyId를 키로 하는 Map으로 변환
    const originalPartyMap = new Map<number, PartyPost>();
    originalPartyData.forEach((party) => {
      originalPartyMap.set(party.id, party);
    });

    // 기존 데이터의 isLeader만 업데이트
    setData((prevData) => {
      return prevData.map((card) => {
        if (!card.partyId) {
          return card;
        }

        const originalParty = originalPartyMap.get(
          typeof card.partyId === 'string'
            ? parseInt(card.partyId, 10)
            : card.partyId
        );

        if (!originalParty) {
          return card;
        }

        // isLeader 재계산
        const isLeader = Boolean(
          user?.id &&
          originalParty.creator_id &&
          user.id === originalParty.creator_id
        );

        return {
          ...card,
          isLeader,
        };
      });
    });
  }, [user, originalPartyData]);

  // 초기 로드
  useEffect(() => {
    if (!isInitialLoad) {
      return;
    }

    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 필터 파라미터 구성
        const params = new URLSearchParams({
          limit: String(INITIAL_LIMIT),
          offset: '0',
        });
        if (sort) {
          params.append('sort', sort);
        }
        if (genre && genre !== 'all') {
          params.append('genre', genre);
        }
        if (search && search.trim()) {
          params.append('search', search.trim());
        }
        if (tab) {
          params.append('tab', tab);
        }

        const response = await fetch(`/api/party?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status >= 400 && response.status < 500) {
            const errorData = await response.json().catch(() => ({}));
            console.error(
              '파티 목록 조회 실패:',
              errorData.error || '클라이언트 오류'
            );
            setData([]);
            setHasMore(false);
            setIsInitialLoad(false);
            setIsLoading(false);
            return;
          }
          if (response.status >= 500) {
            const errorData = await response.json().catch(() => ({}));
            console.error(
              '파티 목록 조회 실패:',
              errorData.error || '서버 오류'
            );
            setData([]);
            setHasMore(false);
            setIsInitialLoad(false);
            setIsLoading(false);
            return;
          }
        }

        const result = await response.json();

        if (result.error) {
          console.error('파티 목록 조회 실패:', result.error);
          setData([]);
          setHasMore(false);
          setIsInitialLoad(false);
          setIsLoading(false);
          return;
        }

        // API 응답에서 data, members, profiles 추출
        const partyList: PartyPost[] = result.data || [];
        const members: PartyMember[] = result.members || [];
        const profiles: UserProfile[] = result.profiles || [];
        // 원본 데이터 저장
        setOriginalPartyData(partyList);
        const transformedData = transformPartyData(
          partyList,
          members,
          profiles
        );

        // 서버에서 이미 정렬된 데이터를 받으므로 클라이언트 측 정렬 불필요
        // 활성/만료 분리는 여전히 필요하므로 sortPartyList 사용 (정렬은 이미 서버에서 수행됨)
        const separatedData = sortPartyList(transformedData, sort || 'latest');

        // 초기 로드: 6개 미만이 와도 그 데이터는 표시
        setData(separatedData);
        setOffset(INITIAL_LIMIT);
        // 받은 데이터가 limit(6개)보다 적으면 더 이상 데이터가 없다는 의미
        // limit과 같거나 더 많으면 더 불러올 데이터가 있을 수 있음
        setHasMore(partyList.length >= INITIAL_LIMIT);
        setIsInitialLoad(false);
      } catch (err) {
        console.error('파티 목록 조회 중 오류:', err);
        setError(
          err instanceof Error
            ? err
            : new Error('데이터를 불러오는 중 오류가 발생했습니다.')
        );
        setData([]);
        setHasMore(false);
        setIsInitialLoad(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoad, genre, search, tab, sort]);

  // 추가 데이터 로드
  const loadMore = useCallback(async () => {
    // 초기 로드 중이거나 이미 로딩 중이거나 더 이상 데이터가 없으면 리턴
    if (isInitialLoad || isLoadingMore || !hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setError(null);

      // 필터 파라미터 구성
      const params = new URLSearchParams({
        limit: String(SCROLL_LIMIT),
        offset: String(offset),
      });
      if (sort) {
        params.append('sort', sort);
      }
      if (genre && genre !== 'all') {
        params.append('genre', genre);
      }
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      if (tab) {
        params.append('tab', tab);
      }

      const response = await fetch(`/api/party?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json().catch(() => ({}));
          console.error(
            '파티 목록 조회 실패:',
            errorData.error || '클라이언트 오류'
          );
          setHasMore(false);
          return;
        }
        if (response.status >= 500) {
          const errorData = await response.json().catch(() => ({}));
          console.error('파티 목록 조회 실패:', errorData.error || '서버 오류');
          setHasMore(false);
          return;
        }
      }

      const result = await response.json();

      if (result.error) {
        console.error('파티 목록 조회 실패:', result.error);
        setHasMore(false);
        return;
      }

      // API 응답에서 data, members, profiles 추출
      const partyList: PartyPost[] = result.data || [];
      const members: PartyMember[] = result.members || [];
      const profiles: UserProfile[] = result.profiles || [];
      // 원본 데이터 추가 저장
      setOriginalPartyData((prev) => [...prev, ...partyList]);
      const transformedData = transformPartyData(partyList, members, profiles);

      if (partyList.length === 0) {
        // 데이터가 없으면 더 이상 불러올 데이터가 없음
        setHasMore(false);
      } else {
        // 10개 미만이 와도 그 데이터는 표시하고, 더 이상 데이터가 없으면 hasMore를 false로 설정
        // 새로 로드된 데이터를 기존 데이터에 추가한 후 전체 정렬
        setData((prev) => {
          const combined = [...prev, ...transformedData];
          return sortPartyList(combined, sort || 'latest');
        });
        setOffset((prev) => prev + partyList.length);
        // 받은 데이터가 limit(10개)보다 적으면 더 이상 데이터가 없다는 의미
        // limit과 같거나 더 많으면 더 불러올 데이터가 있을 수 있음
        setHasMore(partyList.length >= SCROLL_LIMIT);
      }
    } catch (err) {
      console.error('파티 목록 조회 중 오류:', err);
      setError(
        err instanceof Error
          ? err
          : new Error('데이터를 불러오는 중 오류가 발생했습니다.')
      );
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
    // transformPartyData는 useCallback으로 감싸져 있고 의존성이 없으므로 안정적
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoad, isLoadingMore, hasMore, offset, genre, search, tab, sort]);

  // reset 함수
  const reset = useCallback(() => {
    setData([]);
    setOriginalPartyData([]);
    setHasMore(true);
    setError(null);
    setOffset(0);
    setIsInitialLoad(true);
    setIsLoading(true);
    setIsLoadingMore(false);
  }, []);

  return {
    data,
    hasMore,
    loadMore,
    isLoading: isLoading || isLoadingMore,
    error,
    reset,
  };
};

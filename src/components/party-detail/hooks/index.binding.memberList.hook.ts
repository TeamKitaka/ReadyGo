'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { supabase as baseSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import { usePartyBinding } from './index.binding.hook';
import { getAvatarImagePath } from '@/lib/avatar/getAvatarImagePath';

type PartyMember = Database['public']['Tables']['party_members']['Row'];
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

/**
 * 포맷된 멤버 아이템 타입 (UI에서 바로 사용 가능)
 */
export interface FormattedMemberItem {
  type: 'member' | 'empty';
  userId?: string; // member인 경우
  nickname?: string; // member인 경우
  animalType?: string; // member인 경우
  avatarImagePath?: string; // member인 경우
  isLeader?: boolean; // member인 경우, 파티장 여부
}

/**
 * Hook 파라미터 타입
 */
export interface UseMemberListProps {
  postId: number;
}

/**
 * Hook 반환 타입
 */
export interface UseMemberListReturn {
  formattedMembers: FormattedMemberItem[];
  currentMemberCount: number;
  maxMemberCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * useMemberList Hook
 *
 * - 파티 멤버 및 프로필 조회 (API)
 * - 포맷된 멤버 목록 반환 (파티장 우선, 빈 자리 포함)
 * - 아바타 이미지 경로 계산
 * - 파티 정보 조회 (max_members)
 * - Supabase Realtime을 통한 실시간 멤버 목록 업데이트
 */
export const useMemberList = (
  props: UseMemberListProps
): UseMemberListReturn => {
  const { postId } = props;
  const { user } = useAuth();
  const { data: partyData } = usePartyBinding();

  // 상태 관리
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Realtime 채널 관리
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedPostIdRef = useRef<number | null>(null);
  const fetchMembersRef = useRef<() => Promise<void>>();

  /**
   * 파티 멤버 및 프로필 조회 함수
   */
  const fetchMembers = useCallback(async () => {
    // unmount 체크
    if (!isMountedRef.current) {
      return;
    }

    // postId가 0 이하인 경우 early return
    if (postId <= 0) {
      if (isMountedRef.current) {
        setMembers([]);
        setProfiles([]);
        setIsLoading(false);
        setError(null);
      }
      return;
    }

    // user?.id가 없으면 조회하지 않음
    if (!user?.id) {
      if (isMountedRef.current) {
        setMembers([]);
        setProfiles([]);
        setIsLoading(false);
        setError(null);
      }
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/party/${postId}/members`, {
        method: 'GET',
        credentials: 'include', // HttpOnly 쿠키 포함
      });

      if (!isMountedRef.current) {
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = `API error: 파티 멤버 조회 실패: ${
          errorData.error || 'Unknown error'
        }`;
        const error = new Error(errorMessage);
        setError(error);
        setMembers([]);
        setProfiles([]);
        setIsLoading(false);
        console.error(errorMessage);
        return;
      }

      const result = await response.json();
      const fetchedMembers: PartyMember[] = result.members || [];
      const fetchedProfiles: UserProfile[] = result.profiles || [];

      if (isMountedRef.current) {
        setMembers(fetchedMembers);
        setProfiles(fetchedProfiles);
        setIsLoading(false);
        setError(null);
      }
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      const errorMessage = `API error: 파티 멤버 조회 실패: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`;
      const error = new Error(errorMessage);
      setError(error);
      setMembers([]);
      setProfiles([]);
      setIsLoading(false);
      console.error(errorMessage);
    }
  }, [postId, user?.id]);

  // fetchMembers의 최신 버전을 ref에 저장
  useEffect(() => {
    fetchMembersRef.current = fetchMembers;
  }, [fetchMembers]);

  /**
   * Realtime 채널 정리 함수
   */
  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      baseSupabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    subscribedPostIdRef.current = null;
  }, []);

  /**
   * Supabase Realtime 구독 설정
   * party_members 테이블의 INSERT/DELETE 이벤트를 감지하여 자동 갱신
   */
  const subscribeToPostgresChanges = useCallback(
    async (targetPostId: number) => {
      // postId가 유효하지 않으면 early return
      if (targetPostId <= 0 || !user?.id) {
        cleanupChannel();
        return;
      }

      // 이미 같은 postId에 구독 중이면 early return
      if (
        channelRef.current &&
        subscribedPostIdRef.current === targetPostId
      ) {
        return;
      }

      // 기존 채널 정리
      cleanupChannel();

      try {
        // postgres_changes 채널 생성
        const channel = baseSupabase
          .channel(`party_members:${targetPostId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'party_members',
              filter: `post_id=eq.${targetPostId}`,
            },
            (payload) => {
              console.log('Party member INSERT event received:', payload);
              // 멤버 추가 시 목록 갱신
              if (isMountedRef.current && fetchMembersRef.current) {
                fetchMembersRef.current();
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'party_members',
              filter: `post_id=eq.${targetPostId}`,
            },
            (payload) => {
              console.log('Party member DELETE event received:', payload);
              // 멤버 삭제 시 목록 갱신
              if (isMountedRef.current && fetchMembersRef.current) {
                fetchMembersRef.current();
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log(
                `Subscribed to party_members changes for post ${targetPostId}`
              );
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Channel error occurred');
            }
          });

        channelRef.current = channel;
        subscribedPostIdRef.current = targetPostId;
      } catch (error) {
        console.error('Failed to setup Realtime subscription:', error);
        cleanupChannel();
      }
    },
    [user?.id, cleanupChannel]
  );

  /**
   * 초기 목록 로드 및 Realtime 구독
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (postId > 0 && user?.id) {
      fetchMembers();
      subscribeToPostgresChanges(postId);
    }

    return () => {
      isMountedRef.current = false;
      cleanupChannel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, user?.id]);

  /**
   * max_members 계산 (usePartyBinding에서 가져오기, 없으면 기본값 8)
   */
  const maxMemberCount = useMemo(() => {
    return partyData?.max_members ?? 8;
  }, [partyData?.max_members]);

  /**
   * 현재 멤버 수 계산
   */
  const currentMemberCount = useMemo(() => {
    return members.length;
  }, [members.length]);

  /**
   * creator_id 가져오기 (파티장 구분용)
   */
  const creatorId = useMemo(() => {
    return partyData?.creator_id ?? null;
  }, [partyData?.creator_id]);

  /**
   * 포맷된 멤버 목록 계산 (UI에서 바로 사용 가능)
   */
  const formattedMembers = useMemo<FormattedMemberItem[]>(() => {
    // postId가 0 이하인 경우 빈 배열 반환
    if (postId <= 0) {
      return [];
    }

    // 프로필 맵 생성 (user_id를 키로 사용)
    const profileMap = new Map<string, UserProfile>();
    profiles.forEach((profile) => {
      if (profile.id) {
        profileMap.set(profile.id, profile);
      }
    });

    // 실제 멤버를 포맷팅하여 배열로 변환
    const formattedMemberItems: FormattedMemberItem[] = members
      .filter((member) => member.user_id) // user_id가 있는 멤버만
      .map((member) => {
        const memberProfile = member.user_id
          ? profileMap.get(member.user_id)
          : undefined;

        // 파티장 여부 확인 (creator_id와 일치하거나 role='leader')
        const isLeader =
          (creatorId && member.user_id === creatorId) ||
          member.role === 'leader';

        // 닉네임: 프로필이 있으면 nickname, 없으면 "알 수 없음"
        const nickname = memberProfile?.nickname ?? '알 수 없음';

        // 아바타 이미지 경로 계산
        const avatarImagePath = getAvatarImagePath(
          memberProfile?.avatar_url ?? null,
          memberProfile?.animal_type ?? null
        );

        // 동물 타입
        const animalType = memberProfile?.animal_type;

        return {
          type: 'member' as const,
          userId: member.user_id ?? undefined,
          nickname,
          animalType,
          avatarImagePath,
          isLeader,
        };
      });

    // 파티장 우선 정렬
    formattedMemberItems.sort((a, b) => {
      // 파티장이 먼저
      if (a.isLeader && !b.isLeader) {
        return -1;
      }
      if (!a.isLeader && b.isLeader) {
        return 1;
      }
      // 둘 다 파티장이거나 둘 다 일반 멤버인 경우, joined_at 순서 유지
      // (members 배열이 이미 joined_at 순서로 정렬되어 있음)
      return 0;
    });

    // 빈 자리 추가 (max_members까지)
    const emptySlotsCount = Math.max(
      0,
      maxMemberCount - formattedMemberItems.length
    );
    const emptyItems: FormattedMemberItem[] = Array.from({
      length: emptySlotsCount,
    }).map(() => ({
      type: 'empty' as const,
    }));

    // 실제 멤버 + 빈 자리 합치기
    return [...formattedMemberItems, ...emptyItems];
  }, [members, profiles, maxMemberCount, creatorId, postId]);

  return {
    formattedMembers,
    currentMemberCount,
    maxMemberCount,
    isLoading,
    error,
    refetch: fetchMembers,
  };
};

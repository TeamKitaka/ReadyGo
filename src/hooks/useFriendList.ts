'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Database } from '@/types/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase as baseSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/commons/providers/auth/auth.provider';

type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type UserStatusRow = Database['public']['Tables']['user_status']['Row'];
type FriendshipRow = Database['public']['Tables']['friendships']['Row'];

export interface FriendWithProfile {
  user_id: string;
  profile: UserProfileRow | null;
  status: UserStatusRow | null;
}

/**
 * 친구 목록 훅
 * 친구 목록을 조회하고 관리 (profile, status 포함)
 * Realtime을 통해 실시간으로 업데이트됨
 */
export const useFriendList = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedUserIdRef = useRef<string | null>(null);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/friends/list', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setFriends(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime 채널 정리 함수
  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      baseSupabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    subscribedUserIdRef.current = null;
  }, []);

  // Realtime 구독 설정
  const subscribeToRealtime = useCallback(() => {
    if (!user?.id) {
      cleanupChannel();
      return;
    }

    // 이미 같은 사용자에 대해 구독 중이면 스킵
    if (subscribedUserIdRef.current === user.id && channelRef.current) {
      return;
    }

    // 다른 사용자에 대해 구독 중이면 기존 채널 정리
    if (channelRef.current && subscribedUserIdRef.current !== user.id) {
      cleanupChannel();
    }

    try {
      const channelName = `friendships:${user.id}:${Date.now()}`;
      const channel = baseSupabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: user.id },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships',
            // 필터 없이 전체 테이블 구독 (OR 조건 불안정성 회피)
          },
          (payload) => {
            // eslint-disable-next-line no-console
            console.log('[useFriendList] Realtime event:', payload);

            const friendship =
              payload.new || payload.old || ({} as FriendshipRow);

            // JavaScript에서 필터링: user_a 또는 user_b가 현재 사용자이고 status가 accepted인지 확인
            const isRelevant =
              (friendship.user_a === user.id ||
                friendship.user_b === user.id) &&
              (payload.eventType === 'DELETE' ||
                (payload.new as FriendshipRow)?.status === 'accepted');

            if (!isRelevant) {
              return;
            }

            // INSERT: 새로운 친구 추가 시 목록 새로고침
            if (payload.eventType === 'INSERT') {
              // profile과 status를 가져오기 위해 refetch
              fetchFriends();
            }
            // UPDATE: 친구 관계 상태 변경 시 (accepted ↔ 다른 상태) 목록 업데이트
            else if (payload.eventType === 'UPDATE') {
              const updatedFriendship = payload.new as FriendshipRow;
              // accepted가 아니면 목록에서 제거
              if (updatedFriendship.status !== 'accepted') {
                const friendUserId =
                  updatedFriendship.user_a === user.id
                    ? updatedFriendship.user_b
                    : updatedFriendship.user_a;
                if (friendUserId) {
                  setFriends((prev) =>
                    prev.filter((friend) => friend.user_id !== friendUserId)
                  );
                }
              } else {
                // accepted로 변경된 경우 refetch
                fetchFriends();
              }
            }
            // DELETE: 친구 관계 삭제 시 목록에서 제거
            else if (payload.eventType === 'DELETE') {
              const deletedFriendship = payload.old as FriendshipRow;
              const friendUserId =
                deletedFriendship.user_a === user.id
                  ? deletedFriendship.user_b
                  : deletedFriendship.user_a;
              if (friendUserId) {
                setFriends((prev) =>
                  prev.filter((friend) => friend.user_id !== friendUserId)
                );
              }
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            // eslint-disable-next-line no-console
            console.log('[useFriendList] Realtime subscribed');
          } else if (status === 'CHANNEL_ERROR') {
            // eslint-disable-next-line no-console
            console.error('[useFriendList] Realtime error:', err);
            // 에러 발생 시 채널 정리
            if (channelRef.current === channel) {
              channelRef.current = null;
              subscribedUserIdRef.current = null;
            }
          } else if (status === 'CLOSED') {
            // eslint-disable-next-line no-console
            console.log('[useFriendList] Realtime channel closed');
            if (channelRef.current === channel) {
              channelRef.current = null;
              subscribedUserIdRef.current = null;
            }
          }
        });

      channelRef.current = channel;
      subscribedUserIdRef.current = user.id;
    } catch (err) {
      console.error(
        '[useFriendList] Failed to setup Realtime subscription:',
        err
      );
      cleanupChannel();
    }
  }, [user?.id, fetchFriends, cleanupChannel]);

  // 초기 마운트 시 fetch 및 Realtime 구독
  useEffect(() => {
    fetchFriends();
    subscribeToRealtime();

    return () => {
      cleanupChannel();
    };
  }, [fetchFriends, subscribeToRealtime, cleanupChannel]);

  // Note: presence 상태는 컴포넌트 레벨에서 getEffectiveStatus를 통해 구독됨

  return {
    friends,
    loading,
    error,
    refetch: fetchFriends,
  };
};

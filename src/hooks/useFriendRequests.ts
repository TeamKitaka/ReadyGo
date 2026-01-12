'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Database } from '@/types/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase as baseSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/commons/providers/auth/auth.provider';

type FriendRequestRow = Database['public']['Tables']['friend_requests']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

export interface FriendRequestWithSender extends FriendRequestRow {
  sender_profile: UserProfileRow | null;
}

/**
 * 친구 요청 목록 훅
 * 내가 받은 pending 친구 요청 목록을 조회하고 관리
 * Realtime을 통해 실시간으로 업데이트됨
 */
export function useFriendRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FriendRequestWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedUserIdRef = useRef<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 캐시 무시를 위해 timestamp 추가
      const response = await fetch(`/api/friends/requests?t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setRequests(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setRequests([]);
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
      const channelName = `friend_requests:${user.id}:${Date.now()}`;
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
            table: 'friend_requests',
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[useFriendRequests] Realtime event:', payload);

            // INSERT: 새로운 친구 요청 추가
            if (payload.eventType === 'INSERT') {
              const newRequest = payload.new as FriendRequestRow;
              // pending 상태인 경우만 추가
              if (newRequest.status === 'pending') {
                // sender_profile을 가져오기 위해 refetch
                fetchRequests();
              }
            }
            // UPDATE: 친구 요청 상태 변경 (수락/거절 등)
            else if (payload.eventType === 'UPDATE') {
              const updatedRequest = payload.new as FriendRequestRow;
              // pending이 아니면 목록에서 제거
              if (updatedRequest.status !== 'pending') {
                setRequests((prev) =>
                  prev.filter((req) => req.id !== updatedRequest.id)
                );
              } else {
                // pending으로 변경된 경우 refetch
                fetchRequests();
              }
            }
            // DELETE: 친구 요청 삭제
            else if (payload.eventType === 'DELETE') {
              const deletedRequest = payload.old as FriendRequestRow;
              setRequests((prev) =>
                prev.filter((req) => req.id !== deletedRequest.id)
              );
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('[useFriendRequests] Realtime subscribed');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[useFriendRequests] Realtime error:', err);
            // 에러 발생 시 채널 정리
            if (channelRef.current === channel) {
              channelRef.current = null;
              subscribedUserIdRef.current = null;
            }
          } else if (status === 'CLOSED') {
            console.log('[useFriendRequests] Realtime channel closed');
            if (channelRef.current === channel) {
              channelRef.current = null;
              subscribedUserIdRef.current = null;
            }
          }
        });

      channelRef.current = channel;
      subscribedUserIdRef.current = user.id;
    } catch (err) {
      console.error('[useFriendRequests] Failed to setup Realtime subscription:', err);
      cleanupChannel();
    }
  }, [user?.id, fetchRequests, cleanupChannel]);

  // 초기 마운트 시 fetch 및 Realtime 구독
  useEffect(() => {
    fetchRequests();
    subscribeToRealtime();

    return () => {
      cleanupChannel();
    };
  }, [fetchRequests, subscribeToRealtime, cleanupChannel]);

  return {
    requests,
    loading,
    error,
    refetch: fetchRequests,
  };
}


'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Database } from '@/types/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase as baseSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/commons/providers/auth/auth.provider';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

export interface NotificationWithActor extends NotificationRow {
  actor_profile: UserProfileRow | null;
}

/**
 * 알림 목록 훅
 * 내 알림 목록을 조회하고 관리
 * Realtime을 통해 실시간으로 업데이트됨
 */
export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithActor[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedUserIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notifications?t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setNotifications(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
      const channelName = `notifications:${user.id}:${Date.now()}`;
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
            table: 'notifications',
            // filter 제거: RLS 정책으로 자동 필터링됨
          },
          (payload) => {
            // eslint-disable-next-line no-console
            console.log('[useNotifications] Realtime event:', payload);

            // INSERT: 새로운 알림 추가
            if (payload.eventType === 'INSERT') {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const _newNotification = payload.new as NotificationRow;
              // actor_profile을 가져오기 위해 refetch
              fetchNotifications();
            }
            // UPDATE: 알림 상태 변경 (읽음 처리 등)
            else if (payload.eventType === 'UPDATE') {
              const updatedNotification = payload.new as NotificationRow;
              setNotifications((prev) =>
                prev.map((notif) =>
                  notif.id === updatedNotification.id
                    ? { ...notif, ...updatedNotification }
                    : notif
                )
              );
            }
            // DELETE: 알림 삭제
            else if (payload.eventType === 'DELETE') {
              const deletedNotification = payload.old as NotificationRow;
              setNotifications((prev) =>
                prev.filter((notif) => notif.id !== deletedNotification.id)
              );
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            // eslint-disable-next-line no-console
            console.log('[useNotifications] Realtime subscribed');
          } else if (status === 'CHANNEL_ERROR') {
            // eslint-disable-next-line no-console
            console.error('[useNotifications] Realtime error:', err);
            // 에러 발생 시 채널 정리
            if (channelRef.current === channel) {
              channelRef.current = null;
              subscribedUserIdRef.current = null;
            }
          } else if (status === 'CLOSED') {
            // eslint-disable-next-line no-console
            console.log('[useNotifications] Realtime channel closed');
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
        '[useNotifications] Failed to setup Realtime subscription:',
        err
      );
      cleanupChannel();
    }
  }, [user?.id, fetchNotifications, cleanupChannel]);

  // 초기 마운트 시 fetch 및 Realtime 구독
  useEffect(() => {
    fetchNotifications();
    subscribeToRealtime();

    return () => {
      cleanupChannel();
    };
  }, [fetchNotifications, subscribeToRealtime, cleanupChannel]);

  // 읽지 않은 알림 개수
  const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

  // 알림 읽음 처리
  const markAsRead = useCallback(
    async (notificationId?: number) => {
      try {
        const response = await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId }),
        });

        if (!response.ok) {
          throw new Error('Failed to mark notification as read');
        }

        // Optimistic update
        if (notificationId) {
          setNotifications((prev) =>
            (prev || []).map((notif) =>
              notif.id === notificationId ? { ...notif, is_read: true } : notif
            )
          );
        } else {
          // 모두 읽음 처리
          setNotifications((prev) =>
            (prev || []).map((notif) => ({ ...notif, is_read: true }))
          );
        }

        // 서버와 동기화
        await fetchNotifications();
      } catch (err) {
        console.error('[useNotifications] Failed to mark as read:', err);
        throw err;
      }
    },
    [fetchNotifications]
  );

  return {
    notifications,
    loading,
    error,
    unreadCount,
    refetch: fetchNotifications,
    markAsRead,
  };
};

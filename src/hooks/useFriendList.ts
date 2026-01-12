'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Database } from '@/types/supabase';

type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type UserStatusRow = Database['public']['Tables']['user_status']['Row'];

export interface FriendWithProfile {
  user_id: string;
  profile: UserProfileRow | null;
  status: UserStatusRow | null;
}

/**
 * 친구 목록 훅
 * 친구 목록을 조회하고 관리 (profile, status 포함)
 */
export function useFriendList() {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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

  // 초기 마운트 시 fetch
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return {
    friends,
    loading,
    error,
    refetch: fetchFriends,
  };
}


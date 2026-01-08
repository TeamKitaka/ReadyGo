'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/commons/providers/auth/auth.provider';

interface UserProfileData {
  nickname: string;
  isSteamConnected: boolean;
  avatarUrl: string | null;
  animalType: string | null;
}

export const useProfileBinding = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileData>({
    nickname: '',
    isSteamConnected: false,
    avatarUrl: null,
    animalType: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // 1-2) 현재 로그인한 유저의 ID는 useAuth() hook을 통해 가져올 것.
        // user가 null인 경우 에러 처리
        if (!user || !user.id) {
          console.error('User is not authenticated');
          setProfileData({
            nickname: '',
            isSteamConnected: false,
            avatarUrl: null,
            animalType: null,
          });
          setIsLoading(false);
          return;
        }

        const userId = user.id;

        // 1-1) user_profiles 테이블에서 데이터 조회
        // 접속키: ANON키 (supabase 클라이언트는 이미 ANON 키 사용)
        // 테이블명: user_profiles
        // 조회 데이터: id, nickname, steam_id, avatar_url, animal_type
        // 조건: 현재 로그인한 유저의 ID로 조회 (단일 레코드)
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('nickname, steam_id, avatar_url, animal_type')
          .eq('id', userId)
          .single();

        // 1-4) 조회 실패 또는 데이터가 없는 경우 적절한 fallback 처리
        if (profileError || !profile) {
          console.error('Failed to fetch profile:', profileError);
          setProfileData({
            nickname: '',
            isSteamConnected: false,
            avatarUrl: null,
            animalType: null,
          });
          setIsLoading(false);
          return;
        }

        // 1-3) 조회성공 이후 데이터 설정
        // nickname: 조회된 user_profiles.nickname 사용 (null이거나 빈 문자열인 경우 빈 문자열)
        // isSteamConnected: user_profiles.steam_id가 null이 아니면 true, null이면 false
        // avatarUrl: user_profiles.avatar_url 사용
        // animalType: user_profiles.animal_type 사용
        const nickname = profile.nickname?.trim() || '';
        const isSteamConnected =
          profile.steam_id !== null && profile.steam_id !== '';

        setProfileData({
          nickname,
          isSteamConnected,
          avatarUrl: profile.avatar_url || null,
          animalType: profile.animal_type || null,
        });
      } catch (error) {
        console.error('Unexpected error while fetching profile:', error);
        setProfileData({
          nickname: '',
          isSteamConnected: false,
          avatarUrl: null,
          animalType: null,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  return {
    profileData,
    isLoading,
  };
};

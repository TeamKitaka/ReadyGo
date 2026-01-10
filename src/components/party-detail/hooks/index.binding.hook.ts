'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

export interface PartyDetailData {
  id: number;
  party_title: string;
  game_title: string;
  description: string;
  start_date: string; // mm/dd 형식
  start_time: string; // "오전 hh:mm" 또는 "오후 hh:mm" 형식
  start_date_raw: string; // YYYY-MM-DD 형식 (원본)
  start_time_raw: string; // HH:mm:ss 형식 (원본)
  max_members: number;
  control_level: string; // 한글 값
  difficulty: string; // 한글 값
  voice_chat: string | null;
  tags: string[]; // 배열로 변환
  created_at: string;
  creator_id: string;
}

interface UsePartyBindingReturn {
  data: PartyDetailData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  currentUserRole: 'leader' | 'member' | null;
}

// 날짜 형식 변환: YYYY-MM-DD → mm/dd
const formatDate = (dateString: string): string => {
  const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return dateString;
  }
  return `${match[2]}/${match[3]}`;
};

// 시간 형식 변환: HH:mm:ss → "오전 hh:mm" 또는 "오후 hh:mm"
const formatTime = (timeString: string): string => {
  const match = timeString.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (!match) {
    return timeString;
  }

  const [, hourStr, minuteStr] = match;
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const period = hour < 12 ? '오전' : '오후';
  const displayHour =
    hour === 0 ? 12 : hour > 12 ? hour - 12 : hour === 12 ? 12 : hour;

  return `${period} ${displayHour.toString().padStart(2, '0')}:${minute}`;
};

// voice_chat 표시 텍스트 변환: null이면 "사용 안함", 'required'는 "필수 사용", 'optional'은 "선택적 사용"으로 변환
const getVoiceChatLabel = (voiceChat: string | null): string => {
  if (voiceChat === null) {
    return '사용 안함';
  }
  if (voiceChat === 'required') {
    return '필수 사용';
  }
  if (voiceChat === 'optional') {
    return '선택적 사용';
  }
  return voiceChat;
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

// tags 배열 변환
// - 저장 형식: tags는 jsonb 컬럼에 string[] 형태로 저장되어 있음
// - 조회 시: Supabase에서 조회한 tags는 이미 string[] 배열 형태로 반환됨
// - 배열 처리:
//   - tags가 null이면 빈 배열([])로 처리할 것.
//   - tags가 배열이면 그대로 사용할 것.
const parseTags = (tags: unknown): string[] => {
  // tags가 null이면 빈 배열([])로 처리
  if (tags === null || tags === undefined) {
    return [];
  }
  // tags가 배열이면 그대로 사용 (Supabase에서 이미 string[] 형태로 반환됨)
  if (Array.isArray(tags)) {
    return tags.filter((tag) => typeof tag === 'string');
  }
  return [];
};

export const usePartyBinding = (): UsePartyBindingReturn => {
  const params = useParams();
  const partyId = params?.id as string | undefined;
  const [data, setData] = useState<PartyDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<
    'leader' | 'member' | null
  >(null);

  const fetchPartyData = useCallback(async () => {
    if (!partyId) {
      setError(new Error('파티 ID가 없습니다.'));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const id = parseInt(partyId, 10);
      if (isNaN(id)) {
        throw new Error('유효하지 않은 파티 ID입니다.');
      }

      // API Route를 통해 데이터 조회
      const response = await fetch(`/api/party/${id}`, {
        method: 'GET',
        credentials: 'include', // HttpOnly 쿠키 포함 (중요!)
      });

      // 응답 상태 확인
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('인증이 필요합니다.');
        }
        if (response.status === 404) {
          throw new Error('파티 데이터를 찾을 수 없습니다.');
        }
        const errorData = await response.json();
        throw new Error(
          errorData.error || '데이터를 불러오는 중 오류가 발생했습니다.'
        );
      }

      // JSON 파싱
      const responseData = await response.json();
      const { data: partyData, currentUserRole } = responseData;

      if (!partyData) {
        throw new Error('파티 데이터를 찾을 수 없습니다.');
      }

      // 데이터 변환
      const transformedData: PartyDetailData = {
        id: partyData.id,
        party_title: partyData.party_title,
        game_title: partyData.game_title,
        description: partyData.description,
        start_date: formatDate(partyData.start_date),
        start_time: formatTime(partyData.start_time),
        start_date_raw: partyData.start_date, // 원본 데이터 저장
        start_time_raw: partyData.start_time, // 원본 데이터 저장
        max_members: partyData.max_members,
        control_level: getControlLevelLabel(partyData.control_level),
        difficulty: getDifficultyLabel(partyData.difficulty),
        voice_chat: getVoiceChatLabel(partyData.voice_chat),
        tags: parseTags(partyData.tags),
        created_at: partyData.created_at,
        creator_id: partyData.creator_id,
      };

      setData(transformedData);
      // currentUserRole 설정 (null, 'leader', 'member' 중 하나)
      setCurrentUserRole(
        currentUserRole === 'leader' || currentUserRole === 'member'
          ? currentUserRole
          : null
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error('데이터를 불러오는 중 오류가 발생했습니다.')
      );
      setData(null);
      setCurrentUserRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    fetchPartyData();
  }, [fetchPartyData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchPartyData,
    currentUserRole,
  };
};

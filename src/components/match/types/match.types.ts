import type { MatchReasonCoreDTO } from '@/commons/types/match/matchReasonCore.dto';
import type { MatchTagCoreDTO } from '@/commons/types/match/matchTagCore.dto';

/**
 * Match 컴포넌트에서 사용하는 타입 정의
 */

/**
 * 매칭 카드에 표시할 데이터
 *
 * 📌 필드:
 * - id: 화면 표시용 순번
 * - userId: 실제 사용자 ID (UUID)
 * - nickname: 사용자 닉네임
 * - matchRate: 매칭 점수 (0~100)
 * - status: 온라인 상태
 * - tags: 매칭 태그 목록
 * - avatarUrl: 아바타 이미지 URL (optional)
 */
export interface MatchData {
  id: number;
  userId: string;
  nickname: string;
  matchRate: number;
  status: 'online' | 'offline';
  tags: string[];
  avatarUrl?: string;
}

/**
 * API 응답 + 프로필 정보 통합
 *
 * ⚠️ Domain DTO를 읽기 전용으로 사용
 */
export interface MatchResultWithProfile {
  targetUserId: string;
  finalScore: number;
  isOnlineMatched: boolean;
  availabilityHint: 'online' | 'offline' | 'unknown';
  reasons: MatchReasonCoreDTO[]; // Domain DTO (읽기 전용)
  tags: MatchTagCoreDTO[]; // Domain DTO (읽기 전용)
  profile: {
    nickname: string;
    avatarUrl?: string;
    animalType?: string;
  };
  status: 'online' | 'away' | 'dnd' | 'offline';
}

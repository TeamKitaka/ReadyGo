import { getPartyPosts } from '@/repositories/partyPosts.repository';
import {
  getPartyMembersByUserId,
  getPartyMembersByPostId,
  type PartyMemberWithProfile,
} from '@/repositories/partyMembers.repository';
import type { PartyCardProps } from '@/components/home/ui/party-section/card/partyCard';

/**
 * 홈 화면용 파티 목록 조회 Service
 *
 * 📌 필터링 조건:
 * - 시작 시간이 현재 시간 이후 (아직 시작하지 않은 파티)
 * - 파티원 미달 (현재 인원 < 최대 인원)
 * - 현재 사용자가 참여하지 않은 파티
 * - 최대 6개 반환
 * - 시작 시간이 가장 빠른 순 정렬
 *
 * @param userId - 현재 사용자 ID
 * @returns PartyCardProps[] - 홈 화면에 표시할 파티 카드 데이터
 */
export const getHomePartiesService = async (
  userId: string
): Promise<PartyCardProps[]> => {
  try {
    console.log('[getHomePartiesService] Starting for userId:', userId);

    // 1. 현재 사용자가 참여한 파티 ID 목록 조회
    const myParties = await getPartyMembersByUserId(userId);
    const myPartyIds = myParties
      .map((m) => m.post_id)
      .filter((id): id is number => id !== null);
    console.log('[getHomePartiesService] My party IDs:', myPartyIds);

    // 2. 파티 목록 조회 (status 컬럼이 없으므로 전체 조회)
    const allPosts = await getPartyPosts({
      limit: 50,
    });
    console.log('[getHomePartiesService] Total recruiting posts:', allPosts.length);

    // 3. 시작 시간이 미래인 파티만 필터링 + 시작 시간 빠른 순 정렬
    const now = new Date();
    console.log('[getHomePartiesService] Current time:', now.toISOString());

    const futurePosts = allPosts
      .filter((post) => {
        // start_date와 start_time을 결합하여 Date 객체 생성
        const startDateTime = new Date(`${post.start_date}T${post.start_time}`);
        const isFuture = startDateTime > now;
        console.log(
          `[getHomePartiesService] Post ${post.id}: ${post.party_title}, start: ${startDateTime.toISOString()}, isFuture: ${isFuture}`
        );
        return isFuture;
      })
      .filter((post) => {
        const isNotMine = !myPartyIds.includes(post.id);
        console.log(
          `[getHomePartiesService] Post ${post.id}: isNotMine: ${isNotMine}`
        );
        return isNotMine;
      })
      .sort((a, b) => {
        const aTime = new Date(`${a.start_date}T${a.start_time}`);
        const bTime = new Date(`${b.start_date}T${b.start_time}`);
        return aTime.getTime() - bTime.getTime();
      });

    console.log('[getHomePartiesService] Future posts (not mine):', futurePosts.length);

    // 4. 각 파티의 멤버 정보 조회 + 현재 인원 확인
    const partiesWithMembers = await Promise.all(
      futurePosts.map(async (post) => {
        const members = await getPartyMembersByPostId(post.id);
        console.log(`[getHomePartiesService] Post ${post.id} members:`, members.length);
        return {
          post,
          members,
          currentMembers: members.length,
        };
      })
    );

    // 5. 정원 미달 파티만 필터링 + 상위 6개 선택
    const underCapacityParties = partiesWithMembers
      .filter((p) => {
        const isUnderCapacity = p.currentMembers < p.post.max_members;
        console.log(
          `[getHomePartiesService] Post ${p.post.id}: ${p.currentMembers}/${p.post.max_members}, underCapacity: ${isUnderCapacity}`
        );
        return isUnderCapacity;
      })
      .slice(0, 6);

    console.log('[getHomePartiesService] Final parties count:', underCapacityParties.length);

    // 6. PartyCardProps 형태로 변환
    const result = underCapacityParties.map(({ post, members, currentMembers }) => ({
      postId: post.id,
      title: post.party_title,
      gameName: post.game_title,
      description: post.description,
      currentMembers,
      maxMembers: post.max_members,
      members: members.slice(0, 3).map((m: PartyMemberWithProfile) => ({
        animalType: m.animal_type || undefined,
        nickname: m.nickname,
      })),
      tags: Array.isArray(post.tags) ? (post.tags as string[]) : [],
    }));

    console.log('[getHomePartiesService] Returning parties:', result);
    return result;
  } catch (error) {
    console.error('[getHomePartiesService] Error fetching parties:', error);
    return [];
  }
};


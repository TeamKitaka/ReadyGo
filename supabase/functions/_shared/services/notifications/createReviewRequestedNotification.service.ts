import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { Database } from '../../../../types/database.types.ts';
import * as notificationsRepository from '../../repositories/notifications.repository.ts';
import * as userProfilesRepository from '../../repositories/userProfilesRepository.ts';

/**
 * Review Requested Notification Service (Edge Functions용)
 *
 * 📌 책임:
 * - "후기 요청 알림" 생성
 * - actor_id = 게임 시작을 누른 사람 (후기를 받을 사람)
 * - target_id = 후기를 써야 하는 사람 (알림 받을 사람)
 * - entity_id = review_request.id
 * - 알림 메시지: 채팅의 경우 actor_id의 닉네임 사용, 파티는 일반 메시지
 */

export interface ReviewRequestedNotificationInput {
  reviewRequestId: number;
  actorId: string; // 게임 시작을 누른 사람 (후기를 받을 사람)
  targetId: string; // 후기를 써야 하는 사람 (알림 받을 사람)
  contextType: 'chat' | 'party';
  contextId: string; // room_id 또는 post_id
}

/**
 * 후기 요청 알림을 생성한다
 *
 * @param client - Supabase Admin Client
 * @param input - 후기 요청 정보
 * @returns 생성된 알림 정보
 */
export const createReviewRequestedNotification = async (
  client: SupabaseClient<Database>,
  input: ReviewRequestedNotificationInput
) => {
  // entity_type 매핑: 'chat' → 'chat_room', 'party' → 'party_post'
  // entity_id는 review_request.id를 사용
  const entityType = input.contextType === 'chat' ? 'chat_room' : 'party_post';

  // 알림 메시지 생성
  console.log(
    `[createReviewRequestedNotification] Creating notification: context_type=${input.contextType}, actor_id=${input.actorId}, target_id=${input.targetId}`
  );

  let notificationMessage: string | undefined;
  if (input.contextType === 'chat') {
    // 채팅: actor_id의 닉네임 사용
    console.log(
      `[createReviewRequestedNotification] Context type is 'chat', using nickname`
    );
    try {
      const { data: actorProfile, error: profileError } =
        await userProfilesRepository.findByUserId(client, input.actorId);

      if (profileError || !actorProfile) {
        console.error(
          `[createReviewRequestedNotification] Error fetching actor profile for id=${input.actorId}:`,
          profileError
        );
        notificationMessage = '함께한 멤버와의 게임은 어떠셨나요?';
      } else {
        notificationMessage = `${actorProfile.nickname || '알 수 없는 유저'}님과의 게임은 어떠셨나요?`;
      }
    } catch (error) {
      console.error(
        `[createReviewRequestedNotification] Error fetching actor profile:`,
        error
      );
      notificationMessage = '함께한 멤버와의 게임은 어떠셨나요?';
    }
  } else if (input.contextType === 'party') {
    // 파티: 일반 메시지
    console.log(
      `[createReviewRequestedNotification] Context type is 'party', using party message`
    );
    notificationMessage = '함께한 파티원들과의 게임은 어떠셨나요?';
  } else {
    // 예상치 못한 context_type
    console.warn(
      `[createReviewRequestedNotification] Unknown context_type: ${input.contextType}, defaulting to chat message`
    );
    notificationMessage = '함께한 멤버와의 게임은 어떠셨나요?';
  }

  console.log(
    `[createReviewRequestedNotification] Generated message: "${notificationMessage}"`
  );

  // 알림은 target_id (후기를 써야 하는 사람)에게 전송
  return await notificationsRepository.insert(client, {
    user_id: input.targetId, // 후기를 써야 하는 사람 (알림 받을 사람)
    type: 'REVIEW_REQUESTED',
    actor_id: input.actorId, // 게임 시작을 누른 사람 (후기를 받을 사람)
    entity_type: entityType,
    entity_id: String(input.reviewRequestId), // review_request.id
    message: notificationMessage,
  });
};

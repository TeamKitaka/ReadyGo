import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type {
  NotificationType,
  NotificationEntityType,
} from '../types/notification.ts';

/**
 * notifications Repository (Edge Functions용)
 * 책임: notifications 테이블 접근 전담
 *
 * - supabaseAdmin 사용 (RLS 우회)
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 */

export type InsertNotificationParams = {
  user_id: string;
  type: NotificationType;
  actor_id?: string;
  entity_type?: NotificationEntityType;
  entity_id?: string;
  message?: string; // 알림 메시지 (파티의 경우 "함께한 파티원들과의 게임은 어떠셨나요?" 등)
  title?: string; // 알림 제목 (선택적)
};

export type BulkInsertNotificationParams = {
  type: NotificationType;
  actor_id?: string;
  entity_type?: NotificationEntityType;
  entity_id?: string;
  message?: string; // 알림 메시지
  title?: string; // 알림 제목 (선택적)
};

/**
 * 단일 알림을 생성한다
 * - Edge Functions에서만 호출
 * - supabaseAdmin 사용 (RLS 우회)
 * - onConflict: 중복 시 무시 (UNIQUE constraint 대응)
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 * - Supabase 응답 구조를 그대로 반환
 */
export const insert = async (
  client: SupabaseClient,
  params: InsertNotificationParams
) => {
  return await client
    .from('notifications')
    .insert(
      {
        user_id: params.user_id,
        type: params.type,
        actor_id: params.actor_id ?? null,
        entity_type: params.entity_type ?? null,
        entity_id: params.entity_id ?? null,
        message: params.message ?? null,
        title: params.title ?? null,
        is_read: false,
      },
      { ignoreDuplicates: true } // UNIQUE constraint 위반 시 무시
    )
    .select()
    .maybeSingle(); // single() 대신 maybeSingle() 사용 (중복 시 null 반환)
};

/**
 * 여러 유저에게 동일한 알림을 동시에 생성한다
 * - Edge Functions에서만 호출
 * - supabaseAdmin 사용 (RLS 우회)
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 * - Supabase 응답 구조를 그대로 반환
 */
export const bulkInsert = async (
  client: SupabaseClient,
  userIds: string[],
  params: BulkInsertNotificationParams
) => {
  const notifications = userIds.map((userId) => ({
    user_id: userId,
    type: params.type,
    actor_id: params.actor_id ?? null,
    entity_type: params.entity_type ?? null,
    entity_id: params.entity_id ?? null,
    message: params.message ?? null,
    title: params.title ?? null,
    is_read: false,
  }));

  return await client.from('notifications').insert(notifications).select();
};

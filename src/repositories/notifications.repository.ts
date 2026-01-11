import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type {
  NotificationType,
  NotificationEntityType,
} from '@/types/notification';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * notifications Repository
 * 책임: notifications 테이블 접근 전담
 *
 * INSERT: Edge Functions에서만 사용 (supabaseAdmin)
 * SELECT/UPDATE: 클라이언트에서 사용 (SupabaseClient)
 */

export type NotificationRow =
  Database['public']['Tables']['notifications']['Row'];

export type InsertNotificationParams = {
  user_id: string;
  type: NotificationType;
  actor_id?: string;
  entity_type?: NotificationEntityType;
  entity_id?: string;
};

export type BulkInsertNotificationParams = {
  type: NotificationType;
  actor_id?: string;
  entity_type?: NotificationEntityType;
  entity_id?: string;
};

/**
 * 단일 알림을 생성한다
 * - Edge Functions에서만 호출
 * - supabaseAdmin 사용 (RLS 우회)
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 * - Supabase 응답 구조를 그대로 반환
 */
export const insert = async (params: InsertNotificationParams) => {
  return await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: params.user_id,
      type: params.type,
      actor_id: params.actor_id ?? null,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      is_read: false,
    })
    .select()
    .single();
};

/**
 * 여러 유저에게 동일한 알림을 동시에 생성한다
 * - Edge Functions에서만 호출
 * - supabaseAdmin 사용 (RLS 우회)
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 * - Supabase 응답 구조를 그대로 반환
 */
export const bulkInsert = async (
  userIds: string[],
  params: BulkInsertNotificationParams
) => {
  const notifications = userIds.map((userId) => ({
    user_id: userId,
    type: params.type,
    actor_id: params.actor_id ?? null,
    entity_type: params.entity_type ?? null,
    entity_id: params.entity_id ?? null,
    is_read: false,
  }));

  return await supabaseAdmin
    .from('notifications')
    .insert(notifications)
    .select();
};

/**
 * 특정 유저의 알림 목록을 최신순으로 조회한다
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 * - Supabase 응답 구조를 그대로 반환
 */
export const findByUser = async (
  client: SupabaseClient<Database>,
  userId: string,
  limit: number = 50,
  offset: number = 0
) => {
  return await client
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
};

/**
 * 단일 알림을 읽음 처리한다
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 * - Supabase 응답 구조를 그대로 반환
 */
export const markAsRead = async (
  client: SupabaseClient<Database>,
  notificationId: number
) => {
  return await client
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
};

/**
 * 특정 유저의 모든 안 읽은 알림을 읽음 처리한다
 * - 이미 읽은 알림은 업데이트하지 않음 (불필요한 DB 작업 방지)
 * - DB 접근만 수행, 에러 처리는 상위 레이어에서 담당
 * - Supabase 응답 구조를 그대로 반환
 */
export const markAllAsRead = async (
  client: SupabaseClient<Database>,
  userId: string
) => {
  return await client
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
};

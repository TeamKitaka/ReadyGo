/**
 * Game Start Notification Edge Function
 *
 * 📌 역할:
 * - DB Trigger payload 수신
 * - chat_messages / party_messages INSERT 이벤트 확인 (content_type='game_link')
 * - 멤버 조회 및 sender 제외
 * - payload → Service Input 변환
 * - Notification Service 호출
 * - 결과 로깅
 *
 * 📌 트리거 조건:
 * - chat_messages 테이블 AFTER INSERT, content_type='game_link'
 * - party_messages 테이블 AFTER INSERT, content_type='game_link'
 *
 * 📌 중복 방지 전략:
 * - DB의 UNIQUE constraint (unique_notification_per_entity) 사용
 * - notifications 테이블의 (user_id, type, entity_type, entity_id) 조합으로 중복 방지
 * - 메모리 기반 체크 제거 (Edge Function 인스턴스 간 불일치 문제 해결)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { Database } from '../../types/database.types.ts';
import { createGameStartedNotification } from '../_shared/services/notifications/createGameStartedNotification.service.ts';

Deno.serve(async (req) => {
  try {
    // CORS 처리
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers':
            'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Payload 파싱
    const payload = await req.json();
    const { type, table, record, timestamp } = payload;

    // 이벤트 타입 검증
    if (type !== 'INSERT') {
      console.log(
        `[Game Start Notification] Ignored: type=${type}, table=${table}`
      );
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 테이블 구분 및 필수 필드 검증
    let contextType: 'chat' | 'party';
    let contextId: number;
    let senderId: string;

    if (table === 'chat_messages') {
      if (
        !record ||
        !record.id ||
        !record.sender_id ||
        !record.room_id ||
        record.content_type !== 'game_link'
      ) {
        console.log(
          `[Game Start Notification] Ignored: invalid chat_messages payload or not game_link`
        );
        return new Response(
          JSON.stringify({ success: true, message: 'Event ignored' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      contextType = 'chat';
      contextId = record.room_id;
      senderId = record.sender_id;
    } else if (table === 'party_messages') {
      if (
        !record ||
        !record.id ||
        !record.sender_id ||
        !record.post_id ||
        record.content_type !== 'game_link'
      ) {
        console.log(
          `[Game Start Notification] Ignored: invalid party_messages payload or not game_link`
        );
        return new Response(
          JSON.stringify({ success: true, message: 'Event ignored' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      contextType = 'party';
      contextId = record.post_id;
      senderId = record.sender_id;
    } else {
      console.log(
        `[Game Start Notification] Ignored: table=${table} (not chat_messages or party_messages)`
      );
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 로깅용 키 생성 (중복 체크는 DB UNIQUE constraint로 처리)
    const logKey = `${contextType}:${contextId}:${senderId}`;

    console.log(
      `[Game Start Notification] Started: ${logKey}, message_id=${record.id}, timestamp=${timestamp}`
    );

    // Supabase Admin 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // 멤버 조회
    let memberUserIds: string[] = [];

    if (contextType === 'chat') {
      // 1:1 채팅인지 확인
      const { data: chatRoom, error: chatRoomError } = await supabase
        .from('chat_rooms')
        .select('type')
        .eq('id', contextId)
        .single();

      if (chatRoomError) {
        console.error(
          `[Game Start Notification] Error fetching chat room:`,
          chatRoomError
        );
        throw chatRoomError;
      }

      // 1:1 채팅(direct)이 아니면 알림 전송하지 않음
      if (chatRoom?.type !== 'direct') {
        console.log(
          `[Game Start Notification] Ignored: not a direct chat room, type=${chatRoom?.type}`
        );
        return new Response(
          JSON.stringify({ success: true, message: 'Not a direct chat' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // chat_room_members에서 room_id로 멤버 조회
      const { data: members, error: membersError } = await supabase
        .from('chat_room_members')
        .select('user_id')
        .eq('room_id', contextId);

      if (membersError) {
        console.error(
          `[Game Start Notification] Error fetching chat room members:`,
          membersError
        );
        throw membersError;
      }

      memberUserIds = (members || [])
        .map((m) => m.user_id)
        .filter((id): id is string => id !== null);
    } else {
      // party_members에서 post_id로 멤버 조회
      const { data: members, error: membersError } = await supabase
        .from('party_members')
        .select('user_id')
        .eq('post_id', contextId);

      if (membersError) {
        console.error(
          `[Game Start Notification] Error fetching party members:`,
          membersError
        );
        throw membersError;
      }

      memberUserIds = (members || [])
        .map((m) => m.user_id)
        .filter((id): id is string => id !== null);
    }

    // sender 제외
    const receiverIds = memberUserIds.filter((id) => id !== senderId);

    if (receiverIds.length === 0) {
      console.log(
        `[Game Start Notification] No receivers (all members are sender or empty room): ${logKey}`
      );
      return new Response(
        JSON.stringify({ success: true, message: 'No receivers' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 채팅 메시지인 경우: 읽음 상태 확인을 위해 대기 후 읽음 기록 확인
    if (contextType === 'chat') {
      const messageId = record.id;

      // 5~10초 대기 (7초로 설정)
      await new Promise((resolve) => setTimeout(resolve, 7000));

      // chat_message_reads에서 해당 메시지의 읽음 기록 확인
      const { data: readRecords, error: readError } = await supabase
        .from('chat_message_reads')
        .select('user_id')
        .eq('message_id', messageId)
        .in('user_id', receiverIds);

      if (readError) {
        console.error(
          `[Game Start Notification] Error checking read status:`,
          readError
        );
        // 읽음 확인 실패 시에도 알림 전송 (안전한 선택)
      }

      // 읽은 사용자들
      const readUserIds = new Set(
        (readRecords || [])
          .map((r) => r.user_id)
          .filter((id): id is string => id !== null)
      );

      // 읽지 않은 사용자만 필터링
      const unreadReceiverIds = receiverIds.filter(
        (id) => !readUserIds.has(id)
      );

      if (unreadReceiverIds.length === 0) {
        console.log(
          `[Game Start Notification] All receivers have read the message: ${logKey}`
        );
        return new Response(
          JSON.stringify({ success: true, message: 'All receivers read' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // 읽지 않은 사용자에게만 알림 전송
      // entity_id에 messageId를 포함하여 각 메시지마다 별도 알림 생성
      const result = await createGameStartedNotification(supabase, {
        receiverIds: unreadReceiverIds,
        actorId: senderId,
        contextType,
        contextId: String(contextId), // number → string 변환
        messageId: messageId,
      });

      // 결과 확인
      if (result.error) {
        console.error(
          `[Game Start Notification] Error: ${logKey}`,
          result.error
        );
        throw result.error;
      }

      console.log(
        `[Game Start Notification] Completed: ${logKey}, notifications created=${result.data?.length || 0}`
      );

      return new Response(
        JSON.stringify({
          success: true,
          notificationCount: result.data?.length || 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 파티 메시지인 경우: 기존 로직 (읽음 확인 없이 바로 알림 전송)
    // entity_id에 messageId를 포함하여 각 메시지마다 별도 알림 생성
    const messageId = record.id;
    const result = await createGameStartedNotification(supabase, {
      receiverIds,
      actorId: senderId,
      contextType,
      contextId: String(contextId), // number → string 변환
      messageId: messageId,
    });

    // 결과 확인
    if (result.error) {
      console.error(
        `[Game Start Notification] Error: ${logKey}`,
        result.error
      );
      throw result.error;
    }

    console.log(
      `[Game Start Notification] Completed: ${logKey}, notifications created=${result.data?.length || 0}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        notificationCount: result.data?.length || 0,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Game Start Notification] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

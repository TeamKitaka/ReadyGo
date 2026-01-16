import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { ChatRoom, ChatMessage, UserProfile } from '@/types/chat';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface ChatRoomListItem {
  room: ChatRoom;
  otherMember?: UserProfile;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

// ============================================
// 채팅방 관련 함수
// ============================================

/**
 * 특정 사용자와 1:1 채팅방이 있는 모든 사용자 ID 목록 조회
 * - DB 접근만 수행, 에러 처리 없음
 * - N+1 방지를 위한 batch 조회용 함수
 *
 * NOTE: 이 함수는 매칭 시스템에서 사용되며, 다른 사용자의 chat_room_members를
 * 조회해야 하므로 RLS 정책이 올바르게 설정되어 있어야 합니다.
 * RLS 정책: room_id IN (SELECT room_id FROM chat_room_members WHERE user_id = auth.uid())
 */
export const getChatUserIds = async (
  client: SupabaseClient<Database>,
  userId: string
): Promise<string[]> => {
  // userId가 참여한 모든 direct 채팅방의 room_id 조회
  const { data: myRooms, error: error1 } = await client
    .from('chat_room_members')
    .select('room_id')
    .eq('user_id', userId);

  if (error1) {
    console.error('[getChatUserIds] Error fetching myRooms:', error1);
    throw error1;
  }

  if (!myRooms || myRooms.length === 0) {
    return [];
  }

  const roomIds = myRooms
    .map((m) => m.room_id)
    .filter((id): id is number => id !== null);

  if (roomIds.length === 0) {
    return [];
  }

  // 해당 room_id들이 direct 타입인지 확인
  const { data: directRooms, error: error2 } = await client
    .from('chat_rooms')
    .select('id')
    .in('id', roomIds)
    .eq('type', 'direct');

  if (error2) {
    console.error('[getChatUserIds] Error fetching directRooms:', error2);
    throw error2;
  }

  if (!directRooms || directRooms.length === 0) {
    return [];
  }

  const directRoomIds = directRooms
    .map((r) => r.id)
    .filter((id): id is number => id !== null);

  if (directRoomIds.length === 0) {
    return [];
  }

  // 해당 direct 채팅방의 다른 멤버 조회
  // ⚠️ Admin 클라이언트 사용 (RLS 단순 정책으로는 무한 재귀 발생)

  const { data: allMembersInRooms, error: error3 } = await supabaseAdmin
    .from('chat_room_members')
    .select('room_id, user_id')
    .in('room_id', directRoomIds)
    .neq('user_id', userId);

  const otherMembers = allMembersInRooms || [];

  if (error3) {
    console.error('[getChatUserIds] Error fetching otherMembers:', error3);
    throw error3;
  }

  if (!otherMembers || otherMembers.length === 0) {
    return [];
  }

  // user_id만 추출
  const userIds = otherMembers
    .map((m) => m.user_id)
    .filter((id): id is string => id !== null && id !== undefined);

  return userIds;
};

/**
 * 두 사용자 간의 1:1 채팅방이 존재하는지 조회
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 */
export const getChatRoomByMembers = async (
  client: SupabaseClient<Database>,
  userId1: string,
  userId2: string
): Promise<ChatRoom | null> => {
  // chat_room_members를 기준으로 두 사용자가 모두 참여한 채팅방 조회
  const { data: members1, error: error1 } = await client
    .from('chat_room_members')
    .select('room_id')
    .eq('user_id', userId1);

  if (error1) {
    throw error1;
  }

  if (!members1 || members1.length === 0) {
    return null;
  }

  const roomIds = (members1 || [])
    .map((m) => (m as { room_id: number | null }).room_id)
    .filter((id): id is number => id !== null);

  // 두 번째 사용자가 참여한 채팅방 중에서 교집합 찾기
  const { data: members2, error: error2 } = await client
    .from('chat_room_members')
    .select('room_id')
    .eq('user_id', userId2)
    .in('room_id', roomIds);

  if (error2) {
    throw error2;
  }

  if (!members2 || members2.length === 0) {
    return null;
  }

  // 공통 room_id로 chat_rooms 조회 (type='direct'만)
  const commonRoomIds = (members2 || [])
    .map((m) => (m as { room_id: number | null }).room_id)
    .filter((id): id is number => id !== null);

  const { data: rooms, error: error3 } = await client
    .from('chat_rooms')
    .select('*')
    .in('id', commonRoomIds)
    .eq('type', 'direct')
    .limit(1)
    .maybeSingle();

  if (error3) {
    throw error3;
  }

  return rooms;
};

/**
 * 새로운 1:1 채팅방 생성
 * - DB 접근만 수행, 에러 처리 및 비즈니스 로직 없음
 * - Supabase 응답 구조를 그대로 반환
 * - ⚠️ Admin 클라이언트 사용 (RLS INSERT 정책 우회)
 */
export const createChatRoom = async (
  client: SupabaseClient<Database>,
  memberIds: string[]
): Promise<ChatRoom> => {
  // 새 채팅방 생성 (Admin 클라이언트로 RLS 우회)
  const { data: newRoom, error: roomError } = await supabaseAdmin
    .from('chat_rooms')
    .insert({ type: 'direct' })
    .select()
    .single();

  if (roomError) {
    console.error('[Repository] Error creating chat room:', {
      message: roomError.message,
      details: roomError.details,
      hint: roomError.hint,
      code: roomError.code,
    });
    throw roomError;
  }

  if (!newRoom) {
    throw new Error('채팅방 생성에 실패했습니다.');
  }

  // 채팅방 멤버 추가 (Admin 클라이언트로 RLS 우회)
  const now = new Date().toISOString();
  const membersData = memberIds.map((userId) => ({
    room_id: newRoom.id,
    user_id: userId,
    joined_at: now,
  }));

  const { error: membersError } = await supabaseAdmin
    .from('chat_room_members')
    .insert(membersData);

  if (membersError) {
    console.error('[Repository] Error adding chat room members:', {
      message: membersError.message,
      details: membersError.details,
      hint: membersError.hint,
      code: membersError.code,
      roomId: newRoom.id,
      memberIds,
    });
    throw membersError;
  }

  return newRoom;
};

/**
 * 특정 사용자가 참여한 모든 채팅방 목록 조회
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 */
export const getUserChatRooms = async (
  client: SupabaseClient<Database>,
  userId: string
): Promise<ChatRoomListItem[]> => {
  // 1차: chat_room_members를 기준으로 chat_rooms 목록 조회 (room_ids 수집)
  const { data: members, error: membersError } = await client
    .from('chat_room_members')
    .select('room_id')
    .eq('user_id', userId);

  if (membersError) {
    throw membersError;
  }

  if (!members || members.length === 0) {
    return [];
  }

  const roomIds = (members || [])
    .map((m) => (m as { room_id: number | null }).room_id)
    .filter((id): id is number => id !== null);

  // chat_rooms 조회
  const { data: rooms, error: roomsError } = await client
    .from('chat_rooms')
    .select('*')
    .in('id', roomIds)
    .eq('type', 'direct');

  if (roomsError) {
    throw roomsError;
  }

  if (!rooms || rooms.length === 0) {
    return [];
  }

  // 2차: 마지막 메시지 조회 (room_ids를 IN 조건으로 처리하여 N+1 문제 방지)
  const { data: lastMessages, error: messagesError } = await client
    .from('chat_messages')
    .select('*')
    .in('room_id', roomIds)
    .order('created_at', { ascending: false });

  if (messagesError) {
    throw messagesError;
  }

  // room_id별 최신 메시지 1개만 추출
  const lastMessageMap = new Map<number, ChatMessage>();
  if (lastMessages) {
    for (const message of lastMessages) {
      if (message.room_id && !lastMessageMap.has(message.room_id)) {
        lastMessageMap.set(message.room_id, message);
      }
    }
  }

  // 3차: unreadCount 집계 (N+1 문제 방지를 위해 한 번에 조회)
  // chat_messages에서 sender_id가 userId가 아닌 메시지 중
  // chat_message_reads에 없는 메시지 카운트
  const unreadCountMap = new Map<number, number>();

  // 모든 room_id에 대해 한 번에 메시지 조회
  const { data: allUnreadMessages, error: unreadError } = await client
    .from('chat_messages')
    .select('id, room_id')
    .in('room_id', roomIds)
    .neq('sender_id', userId);

  if (unreadError) {
    throw unreadError;
  }

  if (!allUnreadMessages || allUnreadMessages.length === 0) {
    // 모든 방의 unreadCount를 0으로 설정
    roomIds.forEach((roomId: number) => unreadCountMap.set(roomId, 0));
  } else {
    // room_id별로 메시지 ID 그룹화
    const messageIdsByRoom = new Map<number, number[]>();
    for (const msg of allUnreadMessages) {
      if (msg.room_id) {
        const existing = messageIdsByRoom.get(msg.room_id) || [];
        existing.push(msg.id);
        messageIdsByRoom.set(msg.room_id, existing);
      }
    }

    // 모든 메시지 ID 수집
    const allMessageIds = allUnreadMessages.map(
      (m) => (m as { id: number; room_id: number | null }).id
    );

    // 읽음 처리된 메시지 ID 조회 (한 번에)
    const { data: readMessages, error: readError } = await client
      .from('chat_message_reads')
      .select('message_id')
      .eq('user_id', userId)
      .in('message_id', allMessageIds);

    if (readError) {
      throw readError;
    }

    const readMessageIds = new Set(
      (readMessages || [])
        .map((r) => (r as { message_id: number }).message_id)
        .filter((id): id is number => id !== null)
    );

    // 각 room_id별로 읽지 않은 메시지 수 계산
    for (const roomId of roomIds) {
      const messageIds = messageIdsByRoom.get(roomId) || [];
      const unreadCount = messageIds.filter(
        (id) => !readMessageIds.has(id)
      ).length;
      unreadCountMap.set(roomId, unreadCount);
    }
  }

  // 4차: 상대방 사용자 정보 조회 (chat_room_members의 user_id 기준으로 조회)
  const otherMemberMap = new Map<number, UserProfile>();

  // chat_room_members에서 해당 방의 모든 멤버 조회 (한 번에)
  // room_id가 null이 아닌 것만 조회
  const { data: allMembers, error: allMembersError } = await client
    .from('chat_room_members')
    .select('room_id, user_id')
    .in('room_id', roomIds)
    .not('room_id', 'is', null)
    .not('user_id', 'is', null);

  if (allMembersError) {
    throw allMembersError;
  }

  // 현재 사용자가 아닌 다른 멤버 필터링
  const allOtherMembers = (allMembers || []).filter(
    (member) => member.user_id && member.user_id !== userId
  );

  if (allOtherMembers && allOtherMembers.length > 0) {
    // room_id별로 첫 번째 멤버만 선택 (1:1 채팅이므로 각 방당 1명)
    const roomToUserIdMap = new Map<number, string>();
    for (const member of allOtherMembers) {
      if (
        member.room_id &&
        member.user_id &&
        !roomToUserIdMap.has(member.room_id)
      ) {
        roomToUserIdMap.set(member.room_id, member.user_id);
      }
    }

    // 모든 상대방 user_id 수집
    const otherUserIds = Array.from(roomToUserIdMap.values()).filter(
      (id): id is string => id !== null && id !== undefined
    );

    if (otherUserIds.length > 0) {
      // user_profiles 조회 (한 번에)
      const { data: profiles, error: profileError } = await client
        .from('user_profiles')
        .select('*')
        .in('id', otherUserIds);

      if (profileError) {
        throw profileError;
      }

      // user_id를 키로 하는 Map 생성
      const profileMap = new Map<string, UserProfile>();
      if (profiles) {
        for (const profile of profiles) {
          profileMap.set(profile.id, profile);
        }
      }

      // room_id별로 상대방 프로필 매핑
      Array.from(roomToUserIdMap.entries()).forEach(([roomId, otherUserId]) => {
        if (otherUserId) {
          const profile = profileMap.get(otherUserId);
          if (profile) {
            otherMemberMap.set(roomId, profile);
          }
        }
      });
    }
  }

  // 결과 조합
  const result: ChatRoomListItem[] = rooms.map((room: ChatRoom) => {
    const lastMessage = room.id ? lastMessageMap.get(room.id) : undefined;
    const unreadCount = room.id ? unreadCountMap.get(room.id) || 0 : 0;
    const otherMember = room.id ? otherMemberMap.get(room.id) : undefined;

    return {
      room,
      otherMember,
      lastMessage,
      unreadCount,
    };
  });

  // 최신 메시지 기준으로 정렬 (내림차순)
  result.sort((a, b) => {
    const aTime = a.lastMessage?.created_at || a.room.created_at || '';
    const bTime = b.lastMessage?.created_at || b.room.created_at || '';
    return bTime.localeCompare(aTime);
  });

  return result;
};

// ============================================
// 메시지 관련 함수
// ============================================

/**
 * 특정 채팅방의 메시지 목록 조회
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - chat_message_reads 테이블과 조인하여 is_read 상태 계산
 * - Supabase 응답 구조를 그대로 반환
 */
export const getChatMessages = async (
  client: SupabaseClient<Database>,
  roomId: number,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ChatMessage[]> => {
  // 1. 메시지 조회
  const { data: messages, error: messagesError } = await client
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (messagesError) {
    throw messagesError;
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // 2. 메시지 ID 목록 추출
  const messageIds = messages.map((m) => m.id).filter((id): id is number => id !== null);

  if (messageIds.length === 0) {
    return messages;
  }

  // 3. 읽음 처리된 메시지 ID 조회
  const { data: readMessages, error: readError } = await client
    .from('chat_message_reads')
    .select('message_id')
    .eq('user_id', userId)
    .in('message_id', messageIds);

  if (readError) {
    // 읽음 조회 실패 시 모든 메시지를 is_read: false로 처리
    console.warn('[getChatMessages] Error fetching read status:', readError);
    return messages.map((msg) => ({ ...msg, is_read: false } as ChatMessage));
  }

  // 4. 읽음 처리된 메시지 ID Set 생성
  const readMessageIds = new Set(
    (readMessages || []).map((r) => r.message_id).filter((id): id is number => id !== null)
  );

  // 5. 각 메시지에 is_read 필드 추가
  const messagesWithReadStatus = messages.map((message) => ({
    ...message,
    is_read: readMessageIds.has(message.id),
  })) as ChatMessage[];

  // content_type별 읽음 상태 로깅 (디버깅용)
  const readStatusByType = messagesWithReadStatus.reduce(
    (acc, msg) => {
      const type = msg.content_type || 'null';
      if (!acc[type]) {
        acc[type] = { total: 0, read: 0 };
      }
      acc[type].total += 1;
      if (msg.is_read) {
        acc[type].read += 1;
      }
      return acc;
    },
    {} as Record<string, { total: number; read: number }>
  );

  console.log('[getChatMessages] Read status by content_type:', {
    roomId,
    userId,
    totalCount: messagesWithReadStatus.length,
    readStatusByType,
  });

  return messagesWithReadStatus;
};

/**
 * 새로운 메시지 저장
 * - DB 접근만 수행, 에러 처리 및 데이터 가공 없음
 * - Supabase 응답 구조를 그대로 반환
 */
export const sendMessage = async (
  client: SupabaseClient<Database>,
  roomId: number,
  senderId: string,
  content: string,
  contentType: string = 'text'
): Promise<ChatMessage> => {
  const { data, error } = await client
    .from('chat_messages')
    .insert({
      room_id: roomId,
      sender_id: senderId,
      content,
      content_type: contentType,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('메시지 생성에 실패했습니다.');
  }

  return data;
};

/**
 * 메시지 삭제 (hard delete)
 * - DB 접근만 수행, 에러 처리 없음
 */
export const deleteMessage = async (
  client: SupabaseClient<Database>,
  messageId: number
): Promise<void> => {
  const { error } = await client
    .from('chat_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    throw error;
  }
};

// ============================================
// 읽음 처리 관련 함수
// ============================================

/**
 * 특정 메시지들을 읽음 처리
 * - DB 접근만 수행, 에러 처리 없음
 */
export const markMessagesAsRead = async (
  client: SupabaseClient<Database>,
  roomId: number,
  userId: string,
  messageIds: number[]
): Promise<void> => {
  if (messageIds.length === 0) {
    return;
  }

  // 유효한 messageIds만 필터링
  const validMessageIds = messageIds.filter(
    (id) => typeof id === 'number' && !isNaN(id) && id > 0
  );

  if (validMessageIds.length === 0) {
    return;
  }

  // 이미 읽음 처리된 메시지 ID 조회 (중복 방지)
  const { data: existingReads, error: existingReadsError } = await client
    .from('chat_message_reads')
    .select('message_id')
    .eq('user_id', userId)
    .in('message_id', validMessageIds);

  if (existingReadsError) {
    console.error('[markMessagesAsRead] Error checking existing reads:', {
      message: existingReadsError.message,
      details: existingReadsError.details,
      hint: existingReadsError.hint,
      code: existingReadsError.code,
      roomId,
      userId,
    });
    throw existingReadsError;
  }

  const existingMessageIds = new Set(
    (existingReads || []).map((r) => r.message_id)
  );

  // 새로 읽음 처리할 메시지 ID만 필터링
  const newMessageIds = validMessageIds.filter(
    (id) => !existingMessageIds.has(id)
  );

  if (newMessageIds.length > 0) {
    const now = new Date().toISOString();
    const readsData = newMessageIds.map((messageId) => ({
      message_id: messageId,
      user_id: userId,
      read_at: now,
    }));

    // INSERT할 메시지들의 content_type 확인을 위해 메시지 조회
    const { data: messagesToMark, error: messagesError } = await client
      .from('chat_messages')
      .select('id, content_type')
      .in('id', newMessageIds);

    const contentTypeCounts = messagesToMark?.reduce((acc, msg) => {
      const type = msg.content_type || 'null';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    console.log('[markMessagesAsRead] Attempting to insert reads:', {
      roomId,
      userId,
      messageIdsCount: newMessageIds.length,
      messageIds: newMessageIds.slice(0, 10), // 처음 10개만 로그
      contentTypeCounts,
      messagesToMark: messagesToMark?.slice(0, 10).map((msg) => ({
        id: msg.id,
        content_type: msg.content_type,
      })),
    });

    // INSERT만 수행 (RLS 정책이 INSERT만 허용하는 경우 대비)
    const { data: insertData, error: insertError } = await client
      .from('chat_message_reads')
      .insert(readsData)
      .select('message_id'); // INSERT된 데이터 확인용

    if (insertError) {
      // duplicate key 에러는 이미 읽음 처리된 것이므로 무시
      if (insertError.code === '23505') {
        // unique constraint 위반 = 이미 읽음 처리됨
        console.log('[markMessagesAsRead] Duplicate key (already read), ignoring:', {
          roomId,
          userId,
          messageIdsCount: newMessageIds.length,
          messageIds: newMessageIds.slice(0, 10),
        });
        // 이미 읽음 처리된 것이므로 성공으로 처리
        // 하지만 UPDATE는 여전히 수행해야 함
      } else {
        // 다른 에러는 throw
        console.error('[markMessagesAsRead] Insert error:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          roomId,
          userId,
          messageIds: newMessageIds.slice(0, 10), // 처음 10개만 로그
          readsDataCount: readsData.length,
          attemptedInsert: readsData.slice(0, 5), // 처음 5개만 로그
        });
        throw insertError;
      }
    }

    // INSERT 성공 또는 duplicate key 에러인 경우 (이미 읽음 처리됨)
    const actuallyInsertedIds = insertData?.map((r) => r.message_id) || [];
    const duplicateKeyError = insertError?.code === '23505';

    if (duplicateKeyError) {
      console.log('[markMessagesAsRead] Duplicate key (already read), but continuing with UPDATE:', {
        roomId,
        userId,
        messageIdsCount: newMessageIds.length,
        messageIds: newMessageIds.slice(0, 10),
        contentTypeCounts,
      });
      // duplicate key 에러는 이미 읽음 처리된 것이므로 성공으로 처리
      // 하지만 UPDATE는 여전히 수행해야 함
    } else {
      console.log('[markMessagesAsRead] Insert success:', {
        roomId,
        userId,
        insertedCount: actuallyInsertedIds.length,
        expectedCount: readsData.length,
        insertedMessageIds: actuallyInsertedIds.slice(0, 10),
        contentTypeCounts, // INSERT된 메시지들의 content_type 분포
      });
    }

    // chat_message_reads에 INSERT된 후 chat_messages.is_read를 true로 업데이트
    // (duplicate key 에러인 경우에도 UPDATE는 수행 - 이미 읽음 처리되었지만 is_read 필드 업데이트 필요)
    try {
      const { error: updateError } = await client
        .from('chat_messages')
        .update({ is_read: true })
        .in('id', newMessageIds);

      if (updateError) {
        // UPDATE 실패는 로그로만 기록 (chat_message_reads INSERT는 이미 성공했거나 이미 존재함)
        console.warn('[markMessagesAsRead] Failed to update is_read in chat_messages:', {
          error: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
          messageIds: newMessageIds.slice(0, 5),
          totalCount: newMessageIds.length,
        });
        // 에러를 throw하지 않음 - chat_message_reads는 이미 처리되었으므로
      }
    } catch (error) {
      // 예상치 못한 에러도 로그로만 기록 (chat_message_reads는 이미 처리되었으므로)
      console.warn('[markMessagesAsRead] Unexpected error updating is_read:', error);
      // 에러를 throw하지 않음
    }
  }
};

/**
 * 특정 채팅방에서 읽지 않은 메시지 수 계산
 * - DB 접근만 수행, 에러 처리 없음
 */
export const getUnreadCount = async (
  client: SupabaseClient<Database>,
  roomId: number,
  userId: string
): Promise<number> => {
  // chat_messages에서 room_id로 필터링하고, sender_id가 userId가 아닌 메시지 조회
  const { data: messages, error: messagesError } = await client
    .from('chat_messages')
    .select('id')
    .eq('room_id', roomId)
    .neq('sender_id', userId);

  if (messagesError) {
    throw messagesError;
  }

  if (!messages || messages.length === 0) {
    return 0;
  }

  const messageIds = messages.map((m) => (m as { id: number }).id);

  // chat_message_reads 테이블과 조인하여 읽음 처리되지 않은 메시지만 카운트
  const { data: readMessages, error: readError } = await client
    .from('chat_message_reads')
    .select('message_id')
    .eq('user_id', userId)
    .in('message_id', messageIds);

  if (readError) {
    throw readError;
  }

  const readMessageIds = new Set(
    (readMessages || [])
      .map((r) => (r as { message_id: number }).message_id)
      .filter((id): id is number => id !== null)
  );

  // 읽지 않은 메시지 수
  const unreadCount = messageIds.filter(
    (id: number) => !readMessageIds.has(id)
  ).length;

  return unreadCount;
};

/**
 * 특정 채팅방의 모든 읽지 않은 메시지를 읽음 처리
 * - DB 접근만 수행, 에러 처리 없음
 */
export const markRoomAsRead = async (
  client: SupabaseClient<Database>,
  roomId: number,
  userId: string
): Promise<void> => {
  // 해당 채팅방에서 현재 사용자가 읽지 않은 모든 메시지 ID 조회
  // chat_message_reads 테이블에 없는 메시지만 조회 (더 정확한 방법)
  // 먼저 읽지 않은 메시지 ID를 조회
  // content_type 필터링 없음 - 모든 타입의 메시지 포함 (text, game_link, profile_link 등)
  const { data: allMessages, error: allMessagesError } = await client
    .from('chat_messages')
    .select('id, content_type')
    .eq('room_id', roomId)
    .neq('sender_id', userId)
    .not('id', 'is', null);

  if (allMessagesError) {
    console.error('[markRoomAsRead] Error fetching messages:', {
      message: allMessagesError.message,
      code: allMessagesError.code,
      details: allMessagesError.details,
      roomId,
      userId,
    });
    throw allMessagesError;
  }

  if (!allMessages || allMessages.length === 0) {
    return;
  }

  // content_type별 메시지 수 로깅 (디버깅용)
  const contentTypeCounts = allMessages.reduce((acc, msg) => {
    const type = msg.content_type || 'null';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('[markRoomAsRead] Messages by content_type:', {
    roomId,
    userId,
    totalCount: allMessages.length,
    contentTypeCounts,
  });

  const allMessageIds = allMessages
    .map((m) => (m as { id: number }).id)
    .filter((id): id is number => id !== null && typeof id === 'number');

  if (allMessageIds.length === 0) {
    return;
  }

  // 이미 읽음 처리된 메시지 ID 조회
  const { data: readMessages, error: readMessagesError } = await client
    .from('chat_message_reads')
    .select('message_id')
    .eq('user_id', userId)
    .in('message_id', allMessageIds);

  if (readMessagesError) {
    throw readMessagesError;
  }

  const readMessageIds = new Set(
    (readMessages || [])
      .map((r) => (r as { message_id: number }).message_id)
      .filter((id): id is number => id !== null)
  );

  // 읽지 않은 메시지 ID만 필터링
  const unreadMessageIds = allMessageIds.filter(
    (id) => !readMessageIds.has(id)
  );

  // 읽지 않은 메시지의 content_type 확인 (디버깅용)
  const unreadMessagesWithType = allMessages.filter((msg) =>
    unreadMessageIds.includes(msg.id)
  );
  const unreadContentTypeCounts = unreadMessagesWithType.reduce((acc, msg) => {
    const type = msg.content_type || 'null';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('[markRoomAsRead] Unread messages by content_type:', {
    roomId,
    userId,
    unreadCount: unreadMessageIds.length,
    unreadContentTypeCounts,
    unreadMessageIds: unreadMessageIds.slice(0, 20), // 처음 20개만 로그
    unreadMessagesWithType: unreadMessagesWithType.slice(0, 10).map((msg) => ({
      id: msg.id,
      content_type: msg.content_type,
    })),
  });

  if (unreadMessageIds.length === 0) {
    return;
  }

  // markMessagesAsRead 함수를 활용하여 일괄 읽음 처리
  try {
    console.log('[markRoomAsRead] Calling markMessagesAsRead:', {
      roomId,
      userId,
      unreadMessageIdsCount: unreadMessageIds.length,
      unreadMessageIds: unreadMessageIds.slice(0, 10), // 처음 10개만 로그
    });
    await markMessagesAsRead(client, roomId, userId, unreadMessageIds);
    console.log('[markRoomAsRead] markMessagesAsRead completed successfully:', {
      roomId,
      userId,
      unreadMessageIdsCount: unreadMessageIds.length,
    });
  } catch (error) {
    console.error('[markRoomAsRead] Error calling markMessagesAsRead:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      details:
        error && typeof error === 'object' && 'details' in error
          ? (error as { details?: string }).details
          : undefined,
      code:
        error && typeof error === 'object' && 'code' in error
          ? (error as { code?: string }).code
          : undefined,
      roomId,
      userId,
      unreadMessageIdsCount: unreadMessageIds.length,
      error,
      errorType: error?.constructor?.name,
      errorString: String(error),
    });
    throw error;
  }
};

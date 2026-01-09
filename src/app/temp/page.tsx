'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChatRoom, useChatList } from '@/components/chat/hooks';
import { useAuth } from '@/commons/providers/auth/auth.provider';
import Button from '@/commons/components/button';
import Input from '@/commons/components/input';
import Icon from '@/commons/components/icon';
import AnimalCard from '@/commons/components/animal-card';
import { AnimalType } from '@/commons/constants/animal';
import { TierType } from '@/commons/constants/tierType.enum';
import { useGameLinkPreview } from '@/hooks/useGameLinkPreview';
import { useGameSelectModal } from '@/hooks/useGameSelectModal';
import GameLinkPreview from '@/commons/components/game-link-preview';
import GameSelectModal from '@/commons/components/game-select-modal';

// Goose Goose Duck Steam App ID
const GOOSE_GOOSE_DUCK_APP_ID = 1568590;

// 테스트할 유저 UUID
const TEST_USER_ID = 'da532b5d-60ac-46b8-a725-3c38845b15ac';
const TEST_USER_ID_2 = '0783d53d-a804-4e33-83d9-ba97b301d4b2';
const TEST_USER_ID_3 = '84e1e171-a836-4264-8277-c97decb722d3';

export default function RealtimeChatTestPage() {
  const { user, isSessionSynced } = useAuth();
  const [roomId, setRoomId] = useState<number | undefined>(undefined);
  const [inputRoomId, setInputRoomId] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [otherUserId, setOtherUserId] = useState('');

  // 프로필 데이터 (통합 관리)
  const [profiles, setProfiles] = useState<
    Record<string, { nickname: string; isLoading: boolean }>
  >({
    [TEST_USER_ID]: { nickname: '', isLoading: true },
    [TEST_USER_ID_2]: { nickname: '', isLoading: true },
    [TEST_USER_ID_3]: { nickname: '', isLoading: true },
  });

  // 현재 사용자 닉네임
  const [currentUserNickname, setCurrentUserNickname] = useState<string>('');
  const [isLoadingCurrentUserNickname, setIsLoadingCurrentUserNickname] =
    useState(true);

  // 테스트 유저 이메일 (하드코딩)
  const testUserEmail = 'aaa111@aaa.com';
  const testUserEmail2 = 'abc111@abc.com';
  const testUserEmail3 = 'test3@test.com';

  // useChatList Hook 사용
  const {
    chatRooms,
    isLoading: isLoadingChatRooms,
    error: chatListError,
  } = useChatList();

  // useChatRoom Hook 사용 (roomId가 없으면 0으로 전달, hook 내부에서 처리)
  const {
    messages,
    sendMessage,
    isLoading: isLoadingMessages,
    error,
    isConnected,
  } = useChatRoom({
    roomId: roomId || 0, // roomId가 없으면 0으로 전달 (hook 내부에서 처리)
    onMessage: () => {
      // useChatList hook이 자동으로 채팅 목록을 업데이트하므로 별도 처리 불필요
    },
  });

  // 채팅방 목록이 로드되면 자동으로 첫 번째 채팅방 구독
  useEffect(() => {
    // 채팅방 목록이 로드되고, roomId가 설정되지 않았을 때만 자동 선택
    if (!isLoadingChatRooms && chatRooms.length > 0 && !roomId && user?.id) {
      // 가장 최근 메시지가 있는 채팅방을 우선 선택
      // lastMessage가 있는 채팅방 중 첫 번째, 없으면 첫 번째 채팅방
      const roomWithMessage = chatRooms.find((room) => room.lastMessage);
      const targetRoom = roomWithMessage || chatRooms[0];

      if (targetRoom) {
        setRoomId(targetRoom.room.id);
        setInputRoomId(targetRoom.room.id.toString());
      }
    }
  }, [isLoadingChatRooms, chatRooms, roomId, user?.id]);

  const handleSubscribe = () => {
    const id = parseInt(inputRoomId);
    if (isNaN(id)) {
      alert('올바른 roomId를 입력하세요 (숫자)');
      return;
    }
    setRoomId(id); // roomId 변경 시 자동으로 구독됨
  };

  const handleUnsubscribe = () => {
    setRoomId(undefined); // roomId를 undefined로 설정하면 hook이 자동으로 cleanup
  };

  // 테스트용 채팅방 생성
  const handleCreateTestRoom = async () => {
    // 세션 동기화 확인
    if (!isSessionSynced) {
      alert('세션 확인 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (!user?.id) {
      alert('로그인이 필요합니다. 현재 사용자 ID가 없습니다.');
      console.error('User state:', { user, isSessionSynced });
      return;
    }

    try {
      let targetUserId = otherUserId.trim();

      // 상대방 ID가 없으면 채팅방 목록에서 다른 유저 찾기
      if (!targetUserId) {
        // 채팅방 목록에서 다른 멤버 찾기
        const otherMember = chatRooms.find(
          (room) => room.otherMember?.id && room.otherMember.id !== user.id
        )?.otherMember;

        if (!otherMember?.id) {
          alert(
            '다른 유저를 찾을 수 없습니다. 상대방 사용자 ID를 직접 입력하세요.'
          );
          return;
        }

        targetUserId = otherMember.id;
      }

      // 자기 자신과는 채팅방 생성 불가
      if (targetUserId === user.id) {
        alert('자기 자신과는 채팅방을 생성할 수 없습니다.');
        return;
      }

      // API를 통해 채팅방 생성
      const response = await fetch('/api/chat/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          memberIds: [user.id, targetUserId],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage =
          result.message ||
          result.error ||
          result.code ||
          '채팅방 생성에 실패했습니다.';
        console.error('채팅방 생성 실패:', {
          status: response.status,
          statusText: response.statusText,
          result,
          errorMessage,
          memberIds: [user.id, targetUserId],
          errorDetails: result.details,
          errorHint: result.hint,
        });
        throw new Error(
          result.details
            ? `${errorMessage}: ${result.details}`
            : result.hint
              ? `${errorMessage} (${result.hint})`
              : errorMessage
        );
      }

      const newRoom = result.data;
      setRoomId(newRoom.id);
      setInputRoomId(newRoom.id.toString());
      alert(
        `테스트 채팅방 생성 완료! Room ID: ${newRoom.id}\n상대방: ${targetUserId}`
      );
    } catch (error) {
      console.error('Failed to create test room:', error);
      const errorMessage =
        error instanceof Error ? error.message : '채팅방 생성에 실패했습니다.';
      alert(`채팅방 생성 실패: ${errorMessage}`);
    }
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim()) {
      alert('메시지를 입력하세요');
      return;
    }

    // roomId가 없으면 에러
    if (!roomId) {
      alert('채팅방이 생성되지 않았습니다. 먼저 채팅방을 생성해주세요.');
      return;
    }

    // 연결이 안 되어 있으면 에러
    if (!isConnected) {
      alert(
        `채팅방에 연결되지 않았습니다.\n\n현재 Room ID: ${roomId}\n연결 상태: 연결 안됨\n\n잠시 후 다시 시도하거나, 구독 버튼을 클릭하여 다시 구독해주세요.`
      );
      return;
    }

    try {
      const contentToSend = messageContent.trim();
      // 전송 전에 입력 필드 비우기 (즉시 UI 업데이트)
      setMessageContent('');

      await sendMessage(contentToSend);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Room ID 관련 에러인 경우 더 자세한 정보 제공
      if (errorMessage.includes('Room ID')) {
        alert(
          `메시지 전송 실패: ${errorMessage}\n\n현재 Room ID: ${roomId}\n연결 상태: ${isConnected ? '연결됨' : '연결 안됨'}\n\n문제 해결 방법:\n1. 구독 버튼을 클릭하여 다시 구독\n2. 채팅방을 다시 생성\n3. 브라우저 콘솔에서 자세한 에러 확인`
        );
      } else {
        alert(`메시지 전송 실패: ${errorMessage}`);
      }
    }
  };

  // 게임 시작 버튼 클릭 핸들러 (모달 열기)
  const handleGameStartClick = () => {
    if (!roomId) {
      alert('채팅방이 생성되지 않았습니다. 먼저 채팅방을 생성해주세요.');
      return;
    }

    if (!isConnected) {
      alert(
        `채팅방에 연결되지 않았습니다.\n\n현재 Room ID: ${roomId}\n연결 상태: 연결 안됨\n\n잠시 후 다시 시도하거나, 구독 버튼을 클릭하여 다시 구독해주세요.`
      );
      return;
    }

    gameSelectModal.openModal();
  };

  // 게임 선택 모달 확인 핸들러 (링크를 메시지로 전송)
  const handleGameSelectConfirm = async (game: {
    app_id: number;
    name: string;
  }) => {
    if (!roomId || !isConnected) {
      return;
    }

    try {
      const gameLink = `steam://run/${game.app_id}`;
      await sendMessage(gameLink);
      gameSelectModal.closeModal();
    } catch (error) {
      console.error('Failed to send game link:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      alert(`게임 링크 전송 실패: ${errorMessage}`);
    }
  };

  // 프로필 조회 함수 (API 사용)
  const fetchProfile = useCallback(async (userId: string) => {
    setProfiles((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], isLoading: true },
    }));

    try {
      const response = await fetch(`/api/profile/${userId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const data = await response.json();
      const nickname = data.nickname || '알 수 없는 사용자';

      setProfiles((prev) => ({
        ...prev,
        [userId]: { nickname, isLoading: false },
      }));
    } catch (error) {
      console.error(`Failed to fetch profile for ${userId}:`, error);
      setProfiles((prev) => ({
        ...prev,
        [userId]: { nickname: '알 수 없는 사용자', isLoading: false },
      }));
    }
  }, []);

  // 현재 사용자 닉네임 조회 (API 사용)
  const fetchCurrentUserProfile = useCallback(async () => {
    if (!user?.id) {
      setIsLoadingCurrentUserNickname(false);
      return;
    }

    setIsLoadingCurrentUserNickname(true);
    try {
      const response = await fetch('/api/profile/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const data = await response.json();
      setCurrentUserNickname(data.nickname || '알 수 없는 사용자');
    } catch (error) {
      console.error('Failed to fetch current user profile:', error);
      setCurrentUserNickname('알 수 없는 사용자');
    } finally {
      setIsLoadingCurrentUserNickname(false);
    }
  }, [user?.id]);

  // 게임 링크 미리보기 Hook 사용
  const { isGameLink, extractGameAppId, getGameInfo } =
    useGameLinkPreview(messages);

  // 게임 선택 모달 Hook 사용
  const gameSelectModal = useGameSelectModal();

  // 테스트 유저 프로필 조회
  useEffect(() => {
    fetchProfile(TEST_USER_ID);
    fetchProfile(TEST_USER_ID_2);
    fetchProfile(TEST_USER_ID_3);
  }, [fetchProfile]);

  // 현재 사용자 프로필 조회
  useEffect(() => {
    fetchCurrentUserProfile();
  }, [fetchCurrentUserProfile]);

  // useChatList hook이 자동으로 채팅방 목록을 관리하므로 별도 조회 함수 불필요

  // 프로필 카드의 채팅하기 버튼 클릭 핸들러 (채팅방 생성 또는 기존 채팅방 구독)
  const handleProfileChatClick = async (targetUserId: string) => {
    // 세션 동기화 확인
    if (!isSessionSynced) {
      alert('세션 확인 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (!user?.id) {
      alert('로그인이 필요합니다. 현재 사용자 ID가 없습니다.');
      console.error('User state:', { user, isSessionSynced });
      return;
    }

    try {
      // 먼저 기존 채팅방이 있는지 확인
      const existingRoom = chatRooms.find(
        (room) => room.otherMember?.id === targetUserId
      );

      if (existingRoom) {
        // 기존 채팅방이 있으면 바로 구독
        setRoomId(existingRoom.room.id);
        setInputRoomId(existingRoom.room.id.toString());
        return;
      }

      // 기존 채팅방이 없으면 새로 생성
      const response = await fetch('/api/chat/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          memberIds: [user.id, targetUserId],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage =
          result.message ||
          result.error ||
          result.code ||
          '채팅방 생성에 실패했습니다.';
        console.error('채팅방 생성 실패:', {
          status: response.status,
          statusText: response.statusText,
          result,
          errorMessage,
          memberIds: [user.id, targetUserId],
          errorDetails: result.details,
          errorHint: result.hint,
        });
        throw new Error(
          result.details
            ? `${errorMessage}: ${result.details}`
            : result.hint
              ? `${errorMessage} (${result.hint})`
              : errorMessage
        );
      }

      const newRoom = result.data;

      // useChatList hook이 자동으로 채팅방 목록을 업데이트하므로 별도 호출 불필요
      // 현재 선택된 채팅방으로 설정
      setRoomId(newRoom.id);
      setInputRoomId(newRoom.id.toString());
    } catch (error) {
      console.error('Failed to create room:', error);
      const errorMessage =
        error instanceof Error ? error.message : '채팅방 생성에 실패했습니다.';

      // 더 자세한 에러 정보 출력
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }

      alert(
        `채팅방 생성 실패: ${errorMessage}\n\n브라우저 콘솔(F12)에서 자세한 에러 정보를 확인하세요.`
      );
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '100%',
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
        gap: '20px',
      }}
      data-testid="realtime-chat-test-page"
    >
      <h1 style={{ marginBottom: '20px' }}>Realtime Chat Hook 테스트</h1>

      {/* 사용자 정보 */}
      <div
        style={{
          marginBottom: '20px',
          padding: '10px',
          background: '#000000',
          borderRadius: '4px',
        }}
      >
        <p>
          <strong>현재 사용자 (useAuth):</strong>{' '}
          {!isSessionSynced ? (
            <span style={{ color: '#ffc107' }}>세션 확인 중...</span>
          ) : user?.id ? (
            <>
              <span style={{ color: 'green' }}>
                {isLoadingCurrentUserNickname
                  ? '로딩 중...'
                  : currentUserNickname || user.id}
              </span>
              <span
                style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}
              >
                ({user.id})
              </span>
            </>
          ) : (
            <span style={{ color: 'red' }}>로그인 필요</span>
          )}
        </p>
        <p>
          <strong>이메일:</strong> {user?.email || 'N/A'}
        </p>
        <p>
          <strong>세션 동기화 상태:</strong>{' '}
          <span style={{ color: isSessionSynced ? 'green' : '#ffc107' }}>
            {isSessionSynced ? '완료' : '대기 중'}
          </span>
        </p>
      </div>

      {/* 연결 상태 */}
      <div
        style={{
          marginBottom: '20px',
          padding: '10px',
          background: '#000000',
          borderRadius: '4px',
        }}
      >
        <p>
          <strong>Realtime 채널 연결 상태:</strong>{' '}
          <span
            data-testid="is-connected"
            style={{ color: isConnected ? 'green' : 'red', fontWeight: 'bold' }}
          >
            {isConnected
              ? '연결됨 (메시지 전송/수신 가능)'
              : '연결 안됨 (구독 실패 또는 대기 중)'}
          </span>
        </p>
        {error && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px',
              background: '#ffebee',
              borderRadius: '4px',
            }}
          >
            <p style={{ margin: 0, marginBottom: '5px' }}>
              <strong style={{ color: 'red' }}>에러:</strong>{' '}
              <span data-testid="error" style={{ color: 'red' }}>
                {error}
              </span>
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
              * 연결 실패 원인: 세션 확인 실패, 네트워크 문제, 또는 Realtime
              서버 문제일 수 있습니다.
              <br />* 브라우저 콘솔(F12)에서 자세한 에러 로그를 확인하세요.
            </p>
          </div>
        )}
        {roomId && (
          <p style={{ marginTop: '10px' }}>
            <strong>구독 중인 Room ID:</strong> {roomId}
            {!isConnected && !error && (
              <span
                style={{ fontSize: '12px', color: '#999', marginLeft: '10px' }}
              >
                (구독 대기 중...)
              </span>
            )}
          </p>
        )}
        {roomId && !isConnected && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px',
              background: '#fff3cd',
              borderRadius: '4px',
            }}
          >
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
              <strong>연결 안됨 상태입니다.</strong>
              <br />
              가능한 원인:
              <br />
              1. 세션 확인 실패 (로그인 상태 확인 필요)
              <br />
              2. Realtime 서버 연결 문제
              <br />
              3. 네트워크 문제
              <br />
              <br />
              해결 방법: 브라우저 콘솔(F12)에서 에러 로그를 확인하거나, 페이지를
              새로고침 후 다시 시도하세요.
            </p>
          </div>
        )}
      </div>

      {/* 프로필 카드 섹션 */}
      <div
        style={{
          marginBottom: '30px',
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          background: '#000000',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
          프로필 카드 테스트
        </h2>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* 첫 번째 프로필 카드 */}
          {profiles[TEST_USER_ID]?.isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', flex: 1 }}>
              프로필 로딩 중...
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                flex: 1,
                minWidth: '300px',
              }}
            >
              {/* 이메일 표시 */}
              <div
                style={{
                  padding: '8px 12px',
                  background: '#1a1a1a',
                  borderRadius: '6px',
                  border: '1px solid #333',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: '#999',
                    marginBottom: '4px',
                  }}
                >
                  이메일
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#fff',
                    wordBreak: 'break-all',
                  }}
                >
                  {testUserEmail}
                </div>
              </div>

              {/* Animal Card */}
              <AnimalCard
                property="user"
                nickname={profiles[TEST_USER_ID]?.nickname || '로딩 중...'}
                tier={TierType.diamond}
                animal={AnimalType.tiger}
                favoriteGenre="FPS"
                activeTime="18 - 22시"
                gameStyle="공격적"
                weeklyAverage="12.3 시간"
                matchPercentage={94}
                matchReasons={[
                  '동일 게임 선호',
                  '유사한 플레이 시간대',
                  '비슷한 실력대',
                ]}
              />

              {/* 채팅하기 버튼 */}
              <Button
                variant="primary"
                size="m"
                shape="round"
                onClick={() => handleProfileChatClick(TEST_USER_ID)}
                disabled={!user?.id || profiles[TEST_USER_ID]?.isLoading}
                style={{ width: '408px' }}
              >
                채팅 하기 (채팅방 생성)
              </Button>

              <div
                style={{ fontSize: '12px', color: '#666', marginTop: '-10px' }}
              >
                * 채팅하기 버튼 클릭 시: 채팅방 생성 및 자동 구독
              </div>
            </div>
          )}

          {/* 두 번째 프로필 카드 */}
          {profiles[TEST_USER_ID_2]?.isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', flex: 1 }}>
              프로필 로딩 중...
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                flex: 1,
                minWidth: '300px',
              }}
            >
              {/* 이메일 표시 */}
              <div
                style={{
                  padding: '8px 12px',
                  background: '#1a1a1a',
                  borderRadius: '6px',
                  border: '1px solid #333',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: '#999',
                    marginBottom: '4px',
                  }}
                >
                  이메일
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#fff',
                    wordBreak: 'break-all',
                  }}
                >
                  {testUserEmail2}
                </div>
              </div>

              {/* Animal Card */}
              <AnimalCard
                property="user"
                nickname={profiles[TEST_USER_ID_2]?.nickname || '로딩 중...'}
                tier={TierType.diamond}
                animal={AnimalType.fox}
                favoriteGenre="RPG"
                activeTime="20 - 24시"
                gameStyle="방어적"
                weeklyAverage="15.5 시간"
                matchPercentage={88}
                matchReasons={['유사한 플레이 시간대', '비슷한 실력대']}
              />

              {/* 채팅하기 버튼 */}
              <Button
                variant="primary"
                size="m"
                shape="round"
                onClick={() => handleProfileChatClick(TEST_USER_ID_2)}
                disabled={!user?.id || profiles[TEST_USER_ID_2]?.isLoading}
                style={{ width: '408px' }}
              >
                채팅 하기 (채팅방 생성)
              </Button>

              <div
                style={{ fontSize: '12px', color: '#666', marginTop: '-10px' }}
              >
                * 채팅하기 버튼 클릭 시: 채팅방 생성 및 자동 구독
              </div>
            </div>
          )}

          {/* 세 번째 프로필 카드 */}
          {profiles[TEST_USER_ID_3]?.isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', flex: 1 }}>
              프로필 로딩 중...
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                flex: 1,
                minWidth: '300px',
              }}
            >
              {/* 이메일 표시 */}
              <div
                style={{
                  padding: '8px 12px',
                  background: '#1a1a1a',
                  borderRadius: '6px',
                  border: '1px solid #333',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: '#999',
                    marginBottom: '4px',
                  }}
                >
                  이메일
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#fff',
                    wordBreak: 'break-all',
                  }}
                >
                  {testUserEmail3}
                </div>
              </div>

              {/* Animal Card */}
              <AnimalCard
                property="user"
                nickname={profiles[TEST_USER_ID_3]?.nickname || '로딩 중...'}
                tier={TierType.diamond}
                animal={AnimalType.wolf}
                favoriteGenre="MOBA"
                activeTime="14 - 18시"
                gameStyle="균형적"
                weeklyAverage="10.2 시간"
                matchPercentage={92}
                matchReasons={['동일 게임 선호', '유사한 플레이 시간대']}
              />

              {/* 채팅하기 버튼 */}
              <Button
                variant="primary"
                size="m"
                shape="round"
                onClick={() => handleProfileChatClick(TEST_USER_ID_3)}
                disabled={!user?.id || profiles[TEST_USER_ID_3]?.isLoading}
                style={{ width: '408px' }}
              >
                채팅 하기 (채팅방 생성)
              </Button>

              <div
                style={{ fontSize: '12px', color: '#666', marginTop: '-10px' }}
              >
                * 채팅하기 버튼 클릭 시: 채팅방 생성 및 자동 구독
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 채팅 목록 (chatList UI 스타일) */}
      {!user?.id && (
        <div
          style={{
            marginBottom: '20px',
            padding: '15px',
            background: '#fff3cd',
            borderRadius: '4px',
            border: '1px solid #ffc107',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#856404',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            ⚠️ 로그인이 필요합니다
          </p>
          <p
            style={{ margin: '8px 0 0 0', color: '#856404', fontSize: '12px' }}
          >
            채팅 기능을 사용하려면 먼저 로그인해주세요. 401 에러는 로그인하지
            않은 상태에서 발생하는 정상적인 동작입니다.
          </p>
        </div>
      )}
      {chatListError && user?.id && (
        <div
          style={{
            marginBottom: '20px',
            padding: '10px',
            background: '#ffebee',
            borderRadius: '4px',
          }}
        >
          <p style={{ margin: 0, color: 'red', fontSize: '14px' }}>
            채팅 목록 에러: {chatListError}
          </p>
          {chatListError.includes('401') && (
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '12px' }}>
              인증 에러가 발생했습니다. 페이지를 새로고침하거나 다시
              로그인해주세요.
            </p>
          )}
        </div>
      )}
      {isLoadingChatRooms ? (
        <div
          style={{
            marginBottom: '30px',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            background: '#000000',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#999' }}>채팅방 목록 로딩 중...</p>
        </div>
      ) : chatRooms.length > 0 ? (
        <div
          style={{
            marginBottom: '30px',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            background: '#000000',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '20px' }}>채팅 목록</h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {chatRooms.map((chatRoom) => {
              // lastMessage 시간 포맷팅
              let lastMessageTime = '';
              if (chatRoom.lastMessage?.created_at) {
                const messageDate = new Date(chatRoom.lastMessage.created_at);
                const now = new Date();
                const isToday =
                  messageDate.getDate() === now.getDate() &&
                  messageDate.getMonth() === now.getMonth() &&
                  messageDate.getFullYear() === now.getFullYear();

                if (isToday) {
                  const diffMs = now.getTime() - messageDate.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMins / 60);

                  if (diffMins < 1) {
                    lastMessageTime = '방금 전';
                  } else if (diffMins < 60) {
                    lastMessageTime = `${diffMins}분 전`;
                  } else if (diffHours < 24) {
                    lastMessageTime = `${diffHours}시간 전`;
                  }
                } else {
                  const month = messageDate.getMonth() + 1;
                  const day = messageDate.getDate();
                  lastMessageTime = `${month}월 ${day}일`;
                }
              }

              return (
                <div
                  key={chatRoom.room.id}
                  onClick={() => {
                    setRoomId(chatRoom.room.id);
                    setInputRoomId(chatRoom.room.id.toString());
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '8px',
                    border:
                      roomId === chatRoom.room.id
                        ? '1px solid var(--color-border-primary, #007bff)'
                        : '1px solid transparent',
                    background:
                      roomId === chatRoom.room.id
                        ? 'var(--color-bg-secondary, rgba(0, 123, 255, 0.1))'
                        : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (roomId !== chatRoom.room.id) {
                      e.currentTarget.style.background =
                        'var(--color-bg-interactive-teritiary-hover, rgba(0, 0, 0, 0.05))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (roomId !== chatRoom.room.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#ddd',
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: chatRoom.unreadCount > 0 ? '600' : '400',
                          color: '#fff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {chatRoom.otherMember?.nickname || '알 수 없음'}
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          color: '#999',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {chatRoom.lastMessage?.content || '메시지가 없습니다'}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {lastMessageTime && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#999',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lastMessageTime}
                      </div>
                    )}
                    {chatRoom.unreadCount > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '20px',
                          height: '20px',
                          padding: '0 6px',
                          background: '#007bff',
                          borderRadius: '9999px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#fff',
                            textAlign: 'center',
                          }}
                        >
                          {chatRoom.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          style={{
            marginBottom: '30px',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            background: '#000000',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#999' }}>채팅방이 없습니다.</p>
        </div>
      )}

      {/* 수신된 메시지 목록 (메시지 전송 위에 위치) */}
      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '4px',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '10px' }}>
          채팅 메시지 ({messages.length}개)
          {isLoadingMessages && (
            <span
              style={{ fontSize: '14px', color: '#999', marginLeft: '10px' }}
            >
              (로딩 중...)
            </span>
          )}
        </h2>
        {error && (
          <div
            style={{
              padding: '10px',
              background: '#ffebee',
              borderRadius: '4px',
              marginBottom: '10px',
            }}
          >
            <p style={{ margin: 0, color: 'red', fontSize: '14px' }}>
              에러: {error}
            </p>
          </div>
        )}
        <div
          data-testid="messages-list"
          style={{
            maxHeight: '500px',
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'var(--color-bg-secondary, #1a1a1a)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '10px',
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.length === 0 ? (
            <p
              style={{
                color: 'var(--color-text-interactive-secondary, #999)',
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '20px',
                fontFamily: 'var(--typo-body-md-font-family)',
                fontSize: 'var(--typo-body-md-font-size)',
              }}
            >
              수신된 메시지가 없습니다.
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const messageDate = message.created_at
                  ? new Date(message.created_at)
                  : null;
                const timeString = messageDate
                  ? messageDate.toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : '';

                // steam://run/{appId} 패턴 감지
                const gameAppId = extractGameAppId(message.content);
                const messageIsGameLink = isGameLink(message.content);
                const gameInfo = gameAppId ? getGameInfo(gameAppId) : null;

                return (
                  <div
                    key={message.id || index}
                    style={{
                      display: 'flex',
                      width: '100%',
                      flexShrink: 0,
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {isOwnMessage ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'flex-end',
                          gap: '12px',
                          marginLeft: 'auto',
                          alignSelf: 'flex-end',
                          maxWidth: '80%',
                          flexDirection: 'column',
                        }}
                      >
                        {/* 게임 링크인 경우: 미리보기 카드만 표시 */}
                        {messageIsGameLink && gameAppId ? (
                          <GameLinkPreview
                            gameInfo={gameInfo}
                            appId={gameAppId}
                            onGameStart={() => {
                              window.location.href = `steam://run/${gameAppId}`;
                            }}
                          />
                        ) : (
                          /* 일반 메시지인 경우: 메시지 버블 표시 */
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-end',
                              gap: '12px',
                              alignSelf: 'flex-end',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                fontFamily: 'var(--typo-body-sm-font-family)',
                                fontSize: 'var(--typo-body-sm-font-size)',
                                lineHeight: 'var(--typo-body-sm-line-height)',
                                fontWeight: 'var(--typo-body-sm-font-weight)',
                                color:
                                  'var(--color-text-interactive-secondary, #999)',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                paddingBottom: '12px',
                              }}
                            >
                              {timeString}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 20px',
                                background:
                                  'var(--color-bg-interactive-primary-hover, #56e5ce)',
                                borderRadius: '24px',
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: 'var(--typo-body-lg-font-family)',
                                  fontSize: 'var(--typo-body-lg-font-size)',
                                  lineHeight: 'var(--typo-body-lg-line-height)',
                                  fontWeight: 'var(--typo-body-lg-font-weight)',
                                  color:
                                    'var(--color-text-interactive-inverse, #fff)',
                                  whiteSpace: 'normal',
                                  wordBreak: 'normal',
                                  overflowWrap: 'normal',
                                }}
                              >
                                {message.content}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          maxWidth: '80%',
                          flexDirection: 'column',
                        }}
                      >
                        {/* 게임 링크인 경우: 미리보기 카드만 표시 */}
                        {messageIsGameLink && gameAppId ? (
                          <GameLinkPreview
                            gameInfo={gameInfo}
                            appId={gameAppId}
                            onGameStart={() => {
                              window.location.href = `steam://run/${gameAppId}`;
                            }}
                          />
                        ) : (
                          /* 일반 메시지인 경우: 메시지 버블 표시 */
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              gap: '12px',
                              alignItems: 'flex-end',
                            }}
                          >
                            <div
                              style={{
                                width: '40px',
                                flexShrink: 0,
                              }}
                            />
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px 20px',
                                background: 'var(--color-bg-tertiary, #3a3a3a)',
                                borderRadius: '24px',
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: 'var(--typo-body-lg-font-family)',
                                  fontSize: 'var(--typo-body-lg-font-size)',
                                  lineHeight: 'var(--typo-body-lg-line-height)',
                                  fontWeight: 'var(--typo-body-lg-font-weight)',
                                  color: 'var(--color-text-primary, #fff)',
                                  whiteSpace: 'normal',
                                  wordBreak: 'normal',
                                  overflowWrap: 'normal',
                                }}
                              >
                                {message.content}
                              </span>
                            </div>
                            <div
                              style={{
                                height: '100%',
                                fontFamily: 'var(--typo-body-sm-font-family)',
                                fontSize: 'var(--typo-body-sm-font-size)',
                                lineHeight: 'var(--typo-body-sm-line-height)',
                                fontWeight: 'var(--typo-body-sm-font-weight)',
                                color:
                                  'var(--color-text-interactive-secondary, #999)',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                paddingBottom: '12px',
                              }}
                            >
                              {timeString}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <Button
            onClick={() => {
              // useChatRoom hook은 자동으로 메시지를 관리하므로
              // roomId를 변경하여 메시지를 다시 로드
              if (roomId) {
                const currentRoomId = roomId;
                setRoomId(undefined);
                setTimeout(() => setRoomId(currentRoomId), 100);
              }
            }}
            style={{ fontSize: '12px', padding: '5px 10px' }}
            disabled={!roomId}
          >
            메시지 새로고침
          </Button>
        </div>
      </div>

      {/* 메시지 전송 (프로필 카드 바로 아래) */}
      <div
        style={{
          marginBottom: '20px',
          padding: '20px 16px',
          background: 'var(--color-bg-primary, #030712)',
          borderRadius: '4px',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '10px' }}>메시지 전송</h2>
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1, height: '48px', minWidth: 0 }}>
            <Input
              placeholder="메시지 입력"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSendMessage();
                }
              }}
              style={{ width: '100%' }}
            />
          </div>
          <Button
            variant="primary"
            size="m"
            shape="rectangle"
            data-testid="send-message-btn"
            onClick={handleSendMessage}
            disabled={
              !isConnected ||
              !messageContent.trim() ||
              !roomId ||
              isLoadingMessages
            }
          >
            전송
          </Button>
          <Button
            variant="primary"
            size="m"
            shape="rectangle"
            data-testid="game-start-btn"
            onClick={handleGameStartClick}
            disabled={!roomId || !isConnected}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '48px',
              padding: '14px 20px',
              background: 'var(--color-bg-interactive-primary, #56e5ce)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              flexShrink: 0,
              color: 'var(--color-text-interactive-inverse, white)',
              transition: 'background-color 0.2s',
              fontFamily: 'var(--typo-body-lg-medium-font-family)',
              fontSize: 'var(--typo-body-lg-medium-font-size)',
              lineHeight: 'var(--typo-body-lg-medium-line-height)',
              fontWeight: 'var(--typo-body-lg-medium-font-weight)',
            }}
          >
            <Icon name="gamepad" size={20} />
            <span style={{ whiteSpace: 'nowrap' }}>게임시작</span>
          </Button>
        </div>
        {roomId && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            현재 채팅방: Room ID {roomId}{' '}
            {isConnected ? '(연결됨)' : '(연결 대기 중...)'}
            {isLoadingMessages && ' | 메시지 로딩 중...'}
            {error && ` | 에러: ${error}`}
          </div>
        )}
        {!roomId && (
          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            채팅방이 생성되지 않았습니다. 위에서 채팅방을 생성해주세요.
          </div>
        )}
      </div>

      {/* 테스트용 채팅방 생성 */}
      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          background: '#000000',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '10px' }}>
          테스트용 채팅방 생성
        </h2>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
          채팅방이 없으면 여기서 생성하세요. 상대방 ID를 입력하지 않으면 DB에서
          다른 유저를 자동으로 찾아서 채팅방을 생성합니다.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Input
            placeholder="상대방 사용자 ID (선택사항, 비우면 자기 자신과 생성)"
            value={otherUserId}
            onChange={(e) => setOtherUserId(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button onClick={handleCreateTestRoom} disabled={!user?.id}>
            채팅방 생성
          </Button>
        </div>
      </div>

      {/* 구독 컨트롤 */}
      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '4px',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '10px' }}>채널 구독</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Input
            type="number"
            placeholder="Room ID 입력 (숫자) 또는 위에서 생성"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button
            data-testid="subscribe-btn"
            onClick={handleSubscribe}
            disabled={!user?.id || !!roomId}
          >
            구독
          </Button>
          <Button
            data-testid="unsubscribe-btn"
            onClick={handleUnsubscribe}
            disabled={!isConnected}
          >
            구독 해제
          </Button>
        </div>
      </div>

      {/* 사용 방법 안내 */}
      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          background: '#000000',
          borderRadius: '4px',
          fontSize: '14px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>사용 방법</h3>
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>로그인 상태인지 확인하세요 (위에 사용자 정보 표시됨)</li>
          <li>
            <strong>채팅방 생성:</strong> &quot;테스트용 채팅방 생성&quot;에서
            상대방 사용자 ID를 입력하고 &quot;채팅방 생성&quot; 버튼을
            클릭하세요. (상대방 ID를 비우면 자기 자신과 채팅방이 생성됩니다)
          </li>
          <li>
            생성된 Room ID가 자동으로 입력되면 &quot;구독&quot; 버튼을
            클릭하세요 (자동 구독 방식)
          </li>
          <li>또는 기존 Room ID를 직접 입력할 수도 있습니다</li>
          <li>
            연결 상태가 &quot;연결됨&quot;으로 변경되면 메시지를 전송할 수
            있습니다
          </li>
          <li>
            메시지를 입력하고 &quot;전송&quot; 버튼을 클릭하거나 Enter 키를
            누르세요
          </li>
          <li>수신된 메시지는 아래 목록에 표시됩니다</li>
          <li>
            다른 브라우저/탭에서 같은 Room ID로 구독하면 실시간으로 메시지를
            주고받을 수 있습니다
          </li>
          <li>
            <strong>주의:</strong> Room ID는 실제 DB의 chat_rooms 테이블에
            존재하는 id여야 합니다. 존재하지 않는 Room ID로는 메시지 전송이
            실패합니다.
          </li>
        </ol>
      </div>

      {/* 게임 선택 모달 */}
      <GameSelectModal
        isOpen={gameSelectModal.isOpen}
        onClose={gameSelectModal.closeModal}
        onConfirm={handleGameSelectConfirm}
        games={gameSelectModal.gameList}
        filteredGames={gameSelectModal.filteredGames}
        isLoading={gameSelectModal.isLoadingGames}
        searchQuery={gameSelectModal.searchQuery}
        onSearchChange={gameSelectModal.setSearchQuery}
        selectedGame={gameSelectModal.selectedGame}
        onSelectGame={gameSelectModal.selectGame}
        error={gameSelectModal.error}
      />
    </div>
  );
}

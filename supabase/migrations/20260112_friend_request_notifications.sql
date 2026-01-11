-- Friend Request Notification System
-- 목적: friend_requests INSERT 시 자동으로 알림 생성
-- 
-- 구성:
-- 1. notifications 테이블 UNIQUE constraint 추가 (중복 방지)
-- 2. DB Trigger Function 생성
-- 3. DB Trigger 등록

-- ===========================
-- 1. entity_id 타입 수정 및 UNIQUE Constraint 추가
-- ===========================

-- entity_id를 TEXT 타입으로 변경 (다양한 entity ID 타입 지원)
-- friend_requests.id (bigint), chat_room (uuid) 등 다양한 타입 저장 가능
DO $$
BEGIN
  -- entity_id가 UUID 타입이면 TEXT로 변경
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications'
    AND column_name = 'entity_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE notifications 
    ALTER COLUMN entity_id TYPE TEXT;
  END IF;
END$$;

-- 논리적 중복 방지: 같은 유저에게 같은 엔티티에 대한 같은 타입의 알림은 1개만
-- - 같은 friend_request에 대한 재요청 방지
-- - Race condition 자동 해결
-- - Edge Function 재시도 안전
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_notification_per_entity'
  ) THEN
    ALTER TABLE notifications
    ADD CONSTRAINT unique_notification_per_entity
    UNIQUE (user_id, type, entity_type, entity_id);
  END IF;
END$$;

COMMENT ON CONSTRAINT unique_notification_per_entity ON notifications IS
'중복 알림 방지: 동일 유저-타입-엔티티 조합은 1개만 허용 (NULL 값은 제외)';

-- ===========================
-- 2. Trigger Function 생성
-- ===========================

CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  request_id INT;
BEGIN
  request_id := NEW.id;

  -- Edge Function 호출 (비동기)
  -- Vault에서 SERVICE_ROLE_KEY 가져오기 (기존 cron 패턴과 동일)
  PERFORM
    net.http_post(
      url := 'https://wwyavdsmukthfioqlldn.supabase.co/functions/v1/friend-request-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret 
          FROM vault.decrypted_secrets 
          WHERE name = 'SERVICE_ROLE_KEY'
        )
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'friend_requests',
        'record', row_to_json(NEW),
        'timestamp', EXTRACT(EPOCH FROM NOW()) * 1000
      ),
      timeout_milliseconds := 5000
    );

  RAISE LOG 'Friend request notification triggered: request_id=%', request_id;

  -- INSERT는 항상 성공 (알림 실패가 트랜잭션을 막지 않음)
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 에러가 발생해도 INSERT는 성공
    RAISE WARNING 'Failed to trigger friend request notification for request_id=%: %', request_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_friend_request() IS
'친구 요청 발생 시 Edge Function을 호출하여 알림 생성';

-- ===========================
-- 3. Trigger 등록
-- ===========================

-- 기존 Trigger가 있다면 삭제
DROP TRIGGER IF EXISTS friend_request_notification_trigger ON friend_requests;

-- AFTER INSERT Trigger 생성
CREATE TRIGGER friend_request_notification_trigger
AFTER INSERT ON friend_requests
FOR EACH ROW
EXECUTE FUNCTION notify_friend_request();

COMMENT ON TRIGGER friend_request_notification_trigger ON friend_requests IS
'친구 요청 생성 후 자동으로 알림 생성 Edge Function 호출';


-- Friend Request Notification System
-- 목적: friend_requests INSERT 시 자동으로 알림 생성
-- 
-- 구성:
-- 1. notifications 테이블 UNIQUE constraint 추가 (중복 방지)
-- 2. DB Trigger Function 생성
-- 3. DB Trigger 등록

-- ===========================
-- 1. UNIQUE Constraint 추가
-- ===========================

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
  function_url TEXT;
  service_key TEXT;
  request_id INT;
BEGIN
  -- Supabase 프로젝트 URL (하드코딩 필요)
  -- 프로젝트별로 수정 필요: https://YOUR_PROJECT_REF.supabase.co
  function_url := 'https://wwyavdsmukthfioqlldn.supabase.co/functions/v1/friend-request-notification';
  
  -- Service Role Key는 Supabase Vault에서 가져오기 (보안)
  -- 또는 Database Settings에서 설정한 custom setting 사용
  service_key := current_setting('app.settings.service_role_key', true);
  
  -- Service Key가 없으면 경고만 하고 계속 진행
  IF service_key IS NULL THEN
    RAISE WARNING 'Service role key not configured';
    service_key := '';
  END IF;

  request_id := NEW.id;

  -- Edge Function 호출 (비동기)
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, '')
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'friend_requests',
        'record', row_to_json(NEW),
        'timestamp', EXTRACT(EPOCH FROM NOW()) * 1000  -- milliseconds
      ),
      timeout_milliseconds := 5000  -- 5초 타임아웃
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
$$ LANGUAGE plpgsql;

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


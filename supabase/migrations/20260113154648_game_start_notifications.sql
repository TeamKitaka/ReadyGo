-- Game Start Notification System
-- 목적: chat_messages / party_messages INSERT 시 content_type='game_link'인 경우 자동으로 알림 생성
-- 
-- 구성:
-- 1. DB Trigger Function 생성
-- 2. DB Trigger 등록 (chat_messages, party_messages)

-- ===========================
-- 1. Trigger Function 생성
-- ===========================

CREATE OR REPLACE FUNCTION notify_game_start()
RETURNS TRIGGER AS $$
DECLARE
  message_id INT;
  table_name TEXT;
BEGIN
  message_id := NEW.id;
  table_name := TG_TABLE_NAME;

  -- content_type이 'game_link'가 아니면 무시
  IF NEW.content_type != 'game_link' THEN
    RAISE LOG 'Game start notification skipped: message_id=%, content_type=%', message_id, NEW.content_type;
    RETURN NEW;
  END IF;

  -- Edge Function 호출 (비동기)
  -- Vault에서 SERVICE_ROLE_KEY 가져오기
  PERFORM
    net.http_post(
      url := 'https://wwyavdsmukthfioqlldn.supabase.co/functions/v1/game-start-notification',
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
        'table', table_name,
        'record', row_to_json(NEW),
        'timestamp', EXTRACT(EPOCH FROM NOW()) * 1000
      ),
      timeout_milliseconds := 5000
    );

  RAISE LOG 'Game start notification triggered: message_id=%, table=%', message_id, table_name;

  -- INSERT는 항상 성공 (알림 실패가 트랜잭션을 막지 않음)
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 에러가 발생해도 INSERT는 성공
    RAISE WARNING 'Failed to trigger game start notification for message_id=% (table=%): %', message_id, table_name, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_game_start() IS
'게임 시작 메시지 발생 시 Edge Function을 호출하여 알림 생성';

-- ===========================
-- 2. Trigger 등록
-- ===========================

-- chat_messages 테이블에 Trigger 등록
DROP TRIGGER IF EXISTS game_start_notification_trigger_chat ON chat_messages;

CREATE TRIGGER game_start_notification_trigger_chat
AFTER INSERT ON chat_messages
FOR EACH ROW
WHEN (NEW.content_type = 'game_link')
EXECUTE FUNCTION notify_game_start();

COMMENT ON TRIGGER game_start_notification_trigger_chat ON chat_messages IS
'게임 시작 링크 메시지 생성 후 자동으로 알림 생성 Edge Function 호출';

-- party_messages 테이블에 Trigger 등록
DROP TRIGGER IF EXISTS game_start_notification_trigger_party ON party_messages;

CREATE TRIGGER game_start_notification_trigger_party
AFTER INSERT ON party_messages
FOR EACH ROW
WHEN (NEW.content_type = 'game_link')
EXECUTE FUNCTION notify_game_start();

COMMENT ON TRIGGER game_start_notification_trigger_party ON party_messages IS
'게임 시작 링크 메시지 생성 후 자동으로 알림 생성 Edge Function 호출';


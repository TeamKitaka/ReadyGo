-- Review Request Notification System
-- 목적: review_requests INSERT 시 자동으로 알림 생성
-- 
-- 구성:
-- 1. DB Trigger Function 생성
-- 2. DB Trigger 등록

-- ===========================
-- 1. Trigger Function 생성
-- ===========================

CREATE OR REPLACE FUNCTION notify_review_request()
RETURNS TRIGGER AS $$
DECLARE
  request_id INT;
BEGIN
  request_id := NEW.id;

  -- status가 'pending'일 때만 알림 전송
  IF NEW.status != 'pending' THEN
    RAISE LOG 'Review request notification skipped: request_id=%, status=%', request_id, NEW.status;
    RETURN NEW;
  END IF;

  -- Edge Function 호출 (비동기)
  -- Vault에서 SERVICE_ROLE_KEY 가져오기
  PERFORM
    net.http_post(
      url := 'https://wwyavdsmukthfioqlldn.supabase.co/functions/v1/review-request-notification',
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
        'table', 'review_requests',
        'record', row_to_json(NEW),
        'timestamp', EXTRACT(EPOCH FROM NOW()) * 1000
      ),
      timeout_milliseconds := 5000
    );

  RAISE LOG 'Review request notification triggered: request_id=%', request_id;

  -- INSERT는 항상 성공 (알림 실패가 트랜잭션을 막지 않음)
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 에러가 발생해도 INSERT는 성공
    RAISE WARNING 'Failed to trigger review request notification for request_id=%: %', request_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_review_request() IS
'후기 요청 생성 시 Edge Function을 호출하여 알림 생성';

-- ===========================
-- 2. Trigger 등록
-- ===========================

DROP TRIGGER IF EXISTS review_request_notification_trigger ON review_requests;

CREATE TRIGGER review_request_notification_trigger
AFTER INSERT ON review_requests
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION notify_review_request();

COMMENT ON TRIGGER review_request_notification_trigger ON review_requests IS
'후기 요청 생성 후 자동으로 알림 생성 Edge Function 호출';


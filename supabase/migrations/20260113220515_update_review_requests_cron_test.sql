-- Update Review Requests Cron Job for Testing (30 seconds instead of 30 minutes)
-- 테스트용: 30분 → 30초로 변경

-- ===========================
-- Cron Job 함수 업데이트 (30초로 변경)
-- ===========================

CREATE OR REPLACE FUNCTION process_review_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_record RECORD;
  service_role_key TEXT;
  supabase_url TEXT := 'https://wwyavdsmukthfioqlldn.supabase.co';
  edge_function_url TEXT := supabase_url || '/functions/v1/create-review-requests';
BEGIN
  -- Vault에서 SERVICE_ROLE_KEY 가져오기
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SERVICE_ROLE_KEY'
  LIMIT 1;

  IF service_role_key IS NULL THEN
    RAISE WARNING 'SERVICE_ROLE_KEY not found in vault';
    RETURN;
  END IF;

  -- 30초 전에 생성된 game_start_logs 조회 (테스트용)
  -- 아직 review_requests가 생성되지 않은 것만 처리
  FOR log_record IN
    SELECT gsl.id, gsl.actor_id, gsl.context_type, gsl.context_id
    FROM game_start_logs gsl
    WHERE gsl.created_at < NOW() - INTERVAL '30 seconds'
      AND gsl.context_type IN ('chat', 'party')
      AND NOT EXISTS (
        SELECT 1
        FROM review_requests rr
        WHERE rr.game_start_log_id = gsl.id
      )
    ORDER BY gsl.created_at ASC
    LIMIT 100  -- 한 번에 최대 100개 처리
  LOOP
    BEGIN
      -- Edge Function 호출 (비동기)
      PERFORM
        net.http_post(
          url := edge_function_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
          ),
          body := jsonb_build_object(
            'game_start_log_id', log_record.id
          ),
          timeout_milliseconds := 10000
        );

      RAISE LOG 'Review request processing triggered: game_start_log_id=%', log_record.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- 에러가 발생해도 계속 진행
        RAISE WARNING 'Failed to trigger review request processing for game_start_log_id=%: %', log_record.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION process_review_requests() IS
'테스트용: 30초 전에 생성된 game_start_logs에 대해 review_requests 생성 Edge Function 호출 (프로덕션에서는 30분으로 변경 필요)';


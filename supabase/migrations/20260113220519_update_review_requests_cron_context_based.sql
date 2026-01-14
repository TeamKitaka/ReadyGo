-- Update Review Requests Cron Job - Context Based (새 설계)
-- 테스트용: 30초 (프로덕션에서는 30분으로 변경)

-- ===========================
-- Cron Job 함수 업데이트 (Context 단위 처리)
-- ===========================

CREATE OR REPLACE FUNCTION process_review_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  context_record RECORD;
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

  -- 30초 전에 생성된 game_start_logs를 가진 context들을 조회
  -- (같은 context에서 review_requests가 이미 생성되지 않은 것만)
  FOR context_record IN
    SELECT 
      gsl.context_type,
      gsl.context_id
    FROM game_start_logs gsl
    WHERE gsl.created_at < NOW() - INTERVAL '30 seconds'
      AND gsl.context_type IN ('chat', 'party')
      AND NOT EXISTS (
        -- 같은 context의 game_start_logs 중 하나라도 review_requests가 있으면 제외
        SELECT 1
        FROM review_requests rr
        INNER JOIN game_start_logs gsl2 ON rr.game_start_log_id = gsl2.id
        WHERE gsl2.context_type = gsl.context_type
          AND gsl2.context_id = gsl.context_id
        LIMIT 1
      )
    GROUP BY gsl.context_type, gsl.context_id
    ORDER BY MIN(gsl.created_at) ASC
    LIMIT 100  -- 한 번에 최대 100개 context 처리
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
            'context_type', context_record.context_type,
            'context_id', context_record.context_id
          ),
          timeout_milliseconds := 10000
        );

      RAISE LOG 'Review request processing triggered: context_type=%, context_id=%', context_record.context_type, context_record.context_id;
    EXCEPTION
      WHEN OTHERS THEN
        -- 에러가 발생해도 계속 진행
        RAISE WARNING 'Failed to trigger review request processing for context_type=%, context_id=%: %', context_record.context_type, context_record.context_id, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION process_review_requests() IS
'테스트용: 30초 전에 생성된 game_start_logs를 가진 context들에 대해 review_requests 생성 Edge Function 호출 (프로덕션에서는 30분으로 변경 필요)';


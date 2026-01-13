-- Debug: Review Requests 생성 확인 쿼리
-- 이 쿼리들을 실행해서 문제를 진단하세요

-- 1. 최근 game_start_logs 확인 (30초 전에 생성된 것)
SELECT 
  id,
  actor_id,
  context_type,
  context_id,
  created_at,
  NOW() - created_at AS elapsed_time
FROM game_start_logs
WHERE created_at < NOW() - INTERVAL '30 seconds'
  AND context_type IN ('chat', 'party')
ORDER BY created_at DESC
LIMIT 10;

-- 2. review_requests가 생성되지 않은 game_start_logs 확인
SELECT 
  gsl.id,
  gsl.actor_id,
  gsl.context_type,
  gsl.context_id,
  gsl.created_at,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM review_requests rr 
      WHERE rr.game_start_log_id = gsl.id
    ) THEN 'has_review_requests'
    ELSE 'no_review_requests'
  END AS review_request_status
FROM game_start_logs gsl
WHERE gsl.created_at < NOW() - INTERVAL '30 seconds'
  AND gsl.context_type IN ('chat', 'party')
ORDER BY gsl.created_at DESC
LIMIT 10;

-- 3. Edge Function 로그 확인 (Supabase Dashboard > Logs > Edge Functions에서 확인 필요)


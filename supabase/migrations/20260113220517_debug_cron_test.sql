-- Debug: Cron Job 테스트 및 확인
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

-- 3. pg_cron job 상태 확인
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname = 'process-review-requests';

-- 4. pg_cron job 실행 이력 확인 (최근)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-review-requests')
ORDER BY start_time DESC
LIMIT 10;

-- 5. process_review_requests 함수 직접 테스트 (수동 실행)
-- SELECT process_review_requests();


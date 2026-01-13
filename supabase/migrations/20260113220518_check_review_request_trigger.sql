-- Review Request Notification Trigger 확인
-- 이 쿼리들을 실행해서 트리거가 제대로 설정되었는지 확인하세요

-- 1. review_requests 테이블의 트리거 확인
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'review_requests';

-- 2. notify_review_request 함수 확인
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'notify_review_request';

-- 3. 최근 생성된 review_requests 확인
SELECT 
  id,
  game_start_log_id,
  actor_id,
  target_id,
  status,
  created_at
FROM review_requests
ORDER BY created_at DESC
LIMIT 10;

-- 4. Edge Function 로그는 Supabase Dashboard → Logs → Edge Functions에서 확인 필요
-- review-request-notification 함수의 로그를 확인하세요


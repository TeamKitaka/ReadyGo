-- Update Review Requests UNIQUE Constraint
-- 목적: review_requests 테이블의 UNIQUE constraint를 context 기반으로 변경
-- 
-- 변경 내용:
-- - 기존: (game_start_log_id, actor_id, target_id)
-- - 변경: (context_type, context_id, actor_id, target_id)
--
-- 이유:
-- - 같은 context에서 game_start_logs를 남긴 사용자들끼리만 후기 요청 생성
-- - context 단위로 중복 방지

-- ===========================
-- 1. 기존 UNIQUE Constraint 삭제
-- ===========================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'review_requests_unique_game_actor_target'
  ) THEN
    ALTER TABLE review_requests
    DROP CONSTRAINT review_requests_unique_game_actor_target;
    
    RAISE NOTICE 'Deleted constraint: review_requests_unique_game_actor_target';
  END IF;
END$$;

-- ===========================
-- 2. 새 UNIQUE Constraint 추가
-- ===========================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'review_requests_unique_context_pair'
  ) THEN
    ALTER TABLE review_requests
    ADD CONSTRAINT review_requests_unique_context_pair
    UNIQUE (context_type, context_id, actor_id, target_id);
    
    RAISE NOTICE 'Added constraint: review_requests_unique_context_pair';
  END IF;
END$$;

COMMENT ON CONSTRAINT review_requests_unique_context_pair ON review_requests IS
'후기 요청 중복 방지: 동일 context에서 동일 actor가 동일 target에게 후기 요청은 1개만 허용';


-- Review Requests Constraints
-- 목적: review_requests 테이블에 UNIQUE constraint 및 status CHECK constraint 추가
-- 
-- 구성:
-- 1. UNIQUE constraint 추가 (game_start_log_id, actor_id, target_id)
-- 2. status CHECK constraint 추가 (pending, completed)
-- 3. 인덱스 추가 (성능 최적화)

-- ===========================
-- 1. UNIQUE Constraint 추가
-- ===========================

-- 같은 game_start_log에서 같은 actor가 같은 target에게 후기를 쓸 수 있는 권한은 1개만
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'review_requests_unique_game_actor_target'
  ) THEN
    ALTER TABLE review_requests
    ADD CONSTRAINT review_requests_unique_game_actor_target
    UNIQUE (game_start_log_id, actor_id, target_id);
  END IF;
END$$;

COMMENT ON CONSTRAINT review_requests_unique_game_actor_target ON review_requests IS
'후기 요청 중복 방지: 동일 게임 세션에서 동일 actor가 동일 target에게 후기 요청은 1개만 허용';

-- ===========================
-- 2. Status CHECK Constraint 추가
-- ===========================

-- status가 'pending' 또는 'completed'만 허용
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'review_requests_status_check'
  ) THEN
    ALTER TABLE review_requests
    ADD CONSTRAINT review_requests_status_check
    CHECK (status IN ('pending', 'completed'));
  END IF;
END$$;

COMMENT ON CONSTRAINT review_requests_status_check ON review_requests IS
'후기 요청 상태: pending (대기 중) 또는 completed (완료)만 허용';

-- ===========================
-- 3. 인덱스 추가 (성능 최적화)
-- ===========================

-- game_start_log_id로 조회 (pg_cron에서 사용)
CREATE INDEX IF NOT EXISTS idx_review_requests_game_start_log_id 
ON review_requests(game_start_log_id);

-- actor_id로 조회 (후기 제출 시 사용)
CREATE INDEX IF NOT EXISTS idx_review_requests_actor_id 
ON review_requests(actor_id);

-- status로 조회 (pending 상태 조회 등)
CREATE INDEX IF NOT EXISTS idx_review_requests_status 
ON review_requests(status);

-- actor_id와 target_id 조합으로 조회 (후기 제출 시 사용)
CREATE INDEX IF NOT EXISTS idx_review_requests_actor_target 
ON review_requests(actor_id, target_id);


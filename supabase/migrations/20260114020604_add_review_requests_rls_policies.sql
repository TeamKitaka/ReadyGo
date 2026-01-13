-- Add RLS Policies for review_requests and game_start_logs
-- 목적: Row Level Security 정책 추가
--
-- review_requests:
-- - SELECT: actor_id = auth.uid() OR target_id = auth.uid()
-- - UPDATE: target_id = auth.uid() AND status = 'pending'
-- - INSERT: 서비스 롤만 허용 (RLS 정책 없음)
--
-- game_start_logs:
-- - SELECT: deny all (service_role만 접근)
-- - INSERT: 서비스 롤만 허용

-- ===========================
-- 1. review_requests RLS 활성화
-- ===========================

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

-- ===========================
-- 2. review_requests SELECT Policy
-- ===========================

-- 후기를 받는 사람(actor_id) 또는 후기를 작성하는 사람(target_id)만 조회 가능
CREATE POLICY "Users can view their own review requests"
ON review_requests
FOR SELECT
TO authenticated
USING (actor_id = auth.uid() OR target_id = auth.uid());

COMMENT ON POLICY "Users can view their own review requests" ON review_requests IS
'후기를 받는 사람(actor_id) 또는 후기를 작성하는 사람(target_id)만 조회 가능';

-- ===========================
-- 3. review_requests UPDATE Policy
-- ===========================

-- 후기를 작성하는 사람(target_id)만 완료 처리 가능 (pending 상태만)
CREATE POLICY "Users can update their own pending review requests"
ON review_requests
FOR UPDATE
TO authenticated
USING (target_id = auth.uid() AND status = 'pending')
WITH CHECK (target_id = auth.uid() AND status = 'pending');

COMMENT ON POLICY "Users can update their own pending review requests" ON review_requests IS
'후기를 작성하는 사람(target_id)만 pending 상태의 후기 요청을 완료 처리 가능 (completed 상태로 변경)';

-- ===========================
-- 4. game_start_logs RLS 활성화
-- ===========================

ALTER TABLE game_start_logs ENABLE ROW LEVEL SECURITY;

-- ===========================
-- 5. game_start_logs SELECT Policy (Deny All)
-- ===========================

-- 모든 SELECT 요청 거부 (service_role만 접근 가능)
CREATE POLICY "Deny all SELECT on game_start_logs"
ON game_start_logs
FOR SELECT
TO authenticated
USING (false);

COMMENT ON POLICY "Deny all SELECT on game_start_logs" ON game_start_logs IS
'인증된 사용자는 game_start_logs를 조회할 수 없음 (service_role만 접근)';


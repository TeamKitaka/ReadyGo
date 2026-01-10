-- Step 2: match_exposure_log 테이블 생성
-- 매칭 목록 노출 이력을 기록하여 중복 방지 (4시간 이내 노출된 사용자 제외)

CREATE TABLE IF NOT EXISTS match_exposure_log (
  id BIGSERIAL PRIMARY KEY,
  viewer_id UUID NOT NULL,
  target_id UUID NOT NULL,
  exposed_at TIMESTAMPTZ DEFAULT NOW(),
  context TEXT DEFAULT 'match_list'
);

-- viewer + 최근 시간 기준 조회 (중복 방지 쿼리 최적화)
CREATE INDEX idx_exposure_viewer_time 
ON match_exposure_log (viewer_id, exposed_at DESC);

-- 중복 체크용 (viewer + target 조합)
CREATE INDEX idx_exposure_viewer_target_time 
ON match_exposure_log (viewer_id, target_id, exposed_at DESC);

-- RLS 정책
ALTER TABLE match_exposure_log ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 노출 이력만 조회 가능
CREATE POLICY "Users can view their own exposure log"
ON match_exposure_log FOR SELECT TO authenticated
USING (viewer_id = auth.uid());

-- 서비스 롤만 쓰기 가능 (암묵적으로 제한됨)


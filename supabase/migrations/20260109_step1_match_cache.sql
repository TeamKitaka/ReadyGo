-- Step 1: 매칭 결과 캐시 테이블
-- 목적: 홈 화면 매칭 결과 캐싱으로 응답 속도 개선 (2~5초 → 300ms)

CREATE TABLE IF NOT EXISTS match_results_cache (
  viewer_id UUID NOT NULL,
  target_id UUID NOT NULL,
  score INTEGER NOT NULL,
  reasons JSONB NOT NULL,
  tags JSONB NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (viewer_id, target_id)
);

-- 조회 최적화: viewer 기준 점수 내림차순
CREATE INDEX idx_cache_viewer_score 
ON match_results_cache (viewer_id, score DESC);

-- 캐시 정리용 인덱스 (computed_at 기준 정렬)
CREATE INDEX idx_cache_computed_at 
ON match_results_cache (computed_at);

-- 테이블 코멘트
COMMENT ON TABLE match_results_cache IS 
'매칭 결과 캐시: 실시간 계산 결과를 저장하여 다음 조회 시 빠른 응답 제공';


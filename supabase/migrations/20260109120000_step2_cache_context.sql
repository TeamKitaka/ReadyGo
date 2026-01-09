-- Step 2: match_results_cache에 context 컬럼 추가 및 PK 변경
-- 홈 화면(home)과 매칭 화면(match)의 캐시를 분리하여 관리

-- Step 1: context 컬럼 추가
ALTER TABLE match_results_cache 
ADD COLUMN IF NOT EXISTS context TEXT DEFAULT 'home';

-- Step 2: 기존 PK 제거 및 새 PK 생성
ALTER TABLE match_results_cache 
DROP CONSTRAINT IF EXISTS match_results_cache_pkey;

ALTER TABLE match_results_cache 
ADD PRIMARY KEY (viewer_id, target_id, context);

-- Step 3: 인덱스 재생성
DROP INDEX IF EXISTS idx_cache_viewer_score;

-- context별 점수 조회용
CREATE INDEX idx_cache_viewer_context_score 
ON match_results_cache (viewer_id, context, score DESC);

-- 5분 TTL 체크용 (매칭 화면에서 사용)
CREATE INDEX idx_cache_context_time 
ON match_results_cache (viewer_id, context, computed_at DESC);


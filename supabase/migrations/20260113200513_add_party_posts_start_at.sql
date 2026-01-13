-- Add start_at column to party_posts table
-- 목적: start_date + start_time을 하나의 timestamptz 컬럼으로 저장하여 정렬 성능 향상
-- 
-- 구성:
-- 1. start_at 컬럼 추가 (nullable로 시작)
-- 2. 기존 데이터 backfill
-- 3. NOT NULL 제약조건 추가
-- 4. 정렬 성능을 위한 인덱스 추가

-- ===========================
-- 1. start_at 컬럼 추가
-- ===========================

ALTER TABLE party_posts 
ADD COLUMN start_at timestamptz;

COMMENT ON COLUMN party_posts.start_at IS
'파티 시작 일시 (start_date + start_time을 조합한 timestamptz)';

-- ===========================
-- 2. 기존 데이터 backfill
-- ===========================

-- start_date + start_time을 계산하여 start_at에 저장
UPDATE party_posts
SET start_at = (start_date + start_time)::timestamptz
WHERE start_at IS NULL;

-- ===========================
-- 3. NOT NULL 제약조건 추가
-- ===========================

ALTER TABLE party_posts
ALTER COLUMN start_at SET NOT NULL;

-- ===========================
-- 4. 인덱스 추가
-- ===========================

-- 단일 컬럼 인덱스 (정렬 성능 향상)
CREATE INDEX idx_party_posts_start_at ON party_posts(start_at);
CREATE INDEX idx_party_posts_created_at ON party_posts(created_at);

-- 복합 인덱스 (커서 기반 페이징용)
CREATE INDEX idx_party_posts_created_at_id ON party_posts(created_at DESC, id DESC);
CREATE INDEX idx_party_posts_start_at_id ON party_posts(start_at ASC, id ASC);

COMMENT ON INDEX idx_party_posts_start_at IS
'마감임박순 정렬을 위한 인덱스';

COMMENT ON INDEX idx_party_posts_created_at IS
'최신순 정렬을 위한 인덱스';

COMMENT ON INDEX idx_party_posts_created_at_id IS
'최신순 커서 기반 페이징을 위한 복합 인덱스';

COMMENT ON INDEX idx_party_posts_start_at_id IS
'마감임박순 커서 기반 페이징을 위한 복합 인덱스';

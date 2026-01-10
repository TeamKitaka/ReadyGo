# match_results_cache 캐시 전략 마이그레이션 가이드

## 📋 현재 상태

### ✅ 완료된 작업
1. **캐시 로직 구현 완료**
   - `getHomeMatches`: 홈 화면용 캐시 (무제한 TTL)
   - `getMatchList`: 매칭 화면용 캐시 (5분 TTL)
   - Repository: `matchResultsCache.repository.ts`

2. **마이그레이션 파일 생성 완료**
   - `20260109_step1_match_cache.sql`: 기본 테이블 생성
   - `20260109120000_step2_cache_context.sql`: context 컬럼 추가

### ❌ 미완료 작업
1. **마이그레이션 실행 필요**
   - Supabase Dashboard에서 SQL 실행 필요
   - `context` 컬럼이 DB에 없어서 캐시가 작동하지 않음

---

## 🚀 마이그레이션 실행 방법

### Step 1: Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택: `wwyavdsmukthfioqlldn`
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### Step 2: context 컬럼 추가 SQL 실행

```sql
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
```

### Step 3: 타입 재생성

```bash
npx supabase gen types typescript --project-id wwyavdsmukthfioqlldn > supabase/types/database.types.ts
```

---

## 📊 캐시 전략 상세

### 🏠 홈 화면 (`context: 'home'`)

| 항목 | 정책 | 설명 |
|------|------|------|
| **개수** | 4명 | 최고 매칭율 4명 |
| **캐시 TTL** | 무제한 | 데이터 변경 시까지 유지 |
| **중복 방지** | ❌ 없음 | 항상 최고 점수 |
| **정렬** | 점수 순 | 내림차순 |
| **API** | `/api/match/results` | |

**캐시 로직:**
```typescript
// 1. 캐시 조회
const cached = await matchCacheRepo.findByViewer(client, viewerId, candidateIds);

// 2. 4개 이상이면 즉시 반환
if (cached && cached.length >= 4) {
  return cached.slice(0, 4);
}

// 3. 부족하면 실시간 계산 후 캐시 저장
```

### 🔄 매칭 화면 (`context: 'match'`)

| 항목 | 정책 | 설명 |
|------|------|------|
| **개수** | 12명 | 다양한 매칭 후보 |
| **캐시 TTL** | 5분 | 신선도 유지 |
| **중복 방지** | 조회 24h + 노출 4h | 우선순위 낮춤 |
| **정렬** | 온라인 우선 + 랜덤 | Fisher-Yates |
| **갱신** | 버튼 클릭 | `refresh=true` |
| **API** | `/api/match/list` | |

**캐시 로직:**
```typescript
// 1. 캐시 조회 (5분 TTL, refresh=false일 때만)
if (!refresh) {
  const cached = await matchCacheRepo.findByViewerAndContext(
    client, 
    viewerId, 
    'match'
  );
  
  // 2. 12개 이상이면 즉시 반환
  if (cached && cached.length >= 12) {
    return cached.slice(0, 12);
  }
}

// 3. 실시간 계산
const results = await calculateMatches(...);

// 4. 캐시 저장 (context: 'match')
await matchCacheRepo.upsert(client, {
  viewer_id: viewerId,
  target_id: targetId,
  score: result.finalScore,
  reasons: result.reasons,
  tags: result.tags,
  context: 'match', // ⭐ 중요!
});

// 5. 노출 이력 기록
await matchExposureLogRepo.bulkInsert(client, viewerId, exposedIds, 'match_list');
```

---

## 🔍 캐시 동작 확인 방법

### 1. 캐시 데이터 확인
```sql
-- 홈 화면 캐시
SELECT * FROM match_results_cache 
WHERE viewer_id = 'YOUR_USER_ID' 
AND context = 'home'
ORDER BY score DESC;

-- 매칭 화면 캐시 (5분 이내)
SELECT * FROM match_results_cache 
WHERE viewer_id = 'YOUR_USER_ID' 
AND context = 'match'
AND computed_at >= NOW() - INTERVAL '5 minutes'
ORDER BY score DESC;
```

### 2. 노출 이력 확인
```sql
-- 최근 4시간 노출 이력
SELECT * FROM match_exposure_log
WHERE viewer_id = 'YOUR_USER_ID'
AND exposed_at >= NOW() - INTERVAL '4 hours'
ORDER BY exposed_at DESC;

-- 최근 24시간 프로필 조회
SELECT * FROM match_recent_views
WHERE user_id = 'YOUR_USER_ID'
AND viewed_at >= NOW() - INTERVAL '24 hours'
ORDER BY viewed_at DESC;
```

### 3. 성능 측정
```typescript
// 홈 화면
console.time('Home Matches');
const results = await fetch('/api/match/results');
console.timeEnd('Home Matches');
// 기대값: 캐시 히트 시 ~300ms, 미스 시 ~2-5초

// 매칭 화면
console.time('Match List');
const results = await fetch('/api/match/list');
console.timeEnd('Match List');
// 기대값: 캐시 히트 시 ~500ms, 미스 시 ~3-8초
```

---

## 🎯 기대 효과

### 성능 개선
- **홈 화면**: 2~5초 → 300ms (약 **10배** 개선)
- **매칭 화면**: 3~8초 → 500ms (약 **10배** 개선)

### 서버 부하 감소
- 실시간 계산 횟수 **80% 감소**
- DB 쿼리 수 **70% 감소**

### 사용자 경험 개선
- 즉각적인 응답
- 부드러운 화면 전환
- 중복 노출 최소화

---

## ⚠️ 주의사항

### 캐시 무효화 시점
다음 상황에서 캐시를 무효화해야 합니다:

1. **사용자 데이터 변경**
   - 성향 테스트 완료/재분석
   - Steam 연동/재동기화
   - 프로필 정보 수정

2. **관계 변경**
   - 친구 추가/삭제
   - 차단 추가/해제
   - 채팅방 생성

**구현 방법:**
```typescript
// 특정 사용자의 캐시 삭제
await matchCacheRepo.deleteAllByViewer(client, userId);
```

### RLS 정책
- **SELECT**: 본인 캐시만 조회 가능
- **INSERT/UPDATE/DELETE**: Service Role만 가능
- API에서는 `supabaseAdmin` 사용 필수

---

## 📝 체크리스트

- [ ] Supabase Dashboard에서 SQL 실행
- [ ] 타입 재생성 (`npx supabase gen types...`)
- [ ] 개발 환경에서 테스트
  - [ ] 홈 화면 캐시 동작 확인
  - [ ] 매칭 화면 캐시 동작 확인
  - [ ] 5분 TTL 동작 확인
  - [ ] 목록 갱신 버튼 동작 확인
- [ ] 프로덕션 배포
- [ ] 성능 모니터링

---

## 🐛 트러블슈팅

### 문제: 캐시가 작동하지 않음
**원인**: `context` 컬럼이 DB에 없음
**해결**: 위의 SQL을 Supabase Dashboard에서 실행

### 문제: RLS 에러 (403 Forbidden)
**원인**: 일반 client로 캐시 쓰기 시도
**해결**: API Route에서 `supabaseAdmin` 사용

### 문제: 타입 에러 (context 속성 없음)
**원인**: 타입 정의가 오래됨
**해결**: `npx supabase gen types...` 재실행

---

## 📚 관련 파일

- **Repository**: `src/repositories/matchResultsCache.repository.ts`
- **Services**: 
  - `src/services/match/getHomeMatches.service.ts`
  - `src/services/match/getMatchList.service.ts`
- **API Routes**:
  - `src/app/api/match/results/route.ts`
  - `src/app/api/match/list/route.ts`
- **Migrations**:
  - `supabase/migrations/20260109_step1_match_cache.sql`
  - `supabase/migrations/20260109120000_step2_cache_context.sql`


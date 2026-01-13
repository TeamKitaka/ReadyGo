# 성능 측정 가이드

매칭 시스템의 성능을 측정하고 비교하는 방법을 안내합니다.

## 📚 문서

- [matching-performance-comparison.md](./matching-performance-comparison.md) - 성능 개선 전후 비교 상세

## 🧪 성능 측정 방법

### 방법 1: 자동 비교 스크립트 (권장)

가장 간단한 방법입니다. 이전 버전과 현재 버전을 자동으로 비교합니다.

```bash
# 1. 실행 권한 부여 (최초 1회)
chmod +x scripts/compare-performance.sh

# 2. 스크립트 실행
./scripts/compare-performance.sh
```

**주의사항:**

- `scripts/measure-matching-performance.ts` 파일의 `TEST_USER_ID`를 실제 사용자 ID로 변경해야 합니다.
- 환경 변수 `.env.local`이 설정되어 있어야 합니다.

**결과:**

- `performance-results/before_YYYYMMDD_HHMMSS.txt` - 이전 버전 결과
- `performance-results/after_YYYYMMDD_HHMMSS.txt` - 현재 버전 결과

---

### 방법 2: 수동 측정

더 세밀한 제어가 필요한 경우 수동으로 측정합니다.

#### Step 1: 이전 버전 측정

```bash
# 1. 이전 버전으로 체크아웃 (캐싱 도입 전)
git checkout 379f72f

# 2. 의존성 설치
npm install

# 3. 테스트 사용자 ID 설정
# scripts/measure-matching-performance.ts 파일 수정
# TEST_USER_ID = 'YOUR_ACTUAL_USER_ID'

# 4. 성능 측정
npx tsx scripts/measure-matching-performance.ts > performance-before.txt
```

#### Step 2: 현재 버전 측정

```bash
# 1. 현재 버전으로 복귀
git checkout main  # 또는 develop

# 2. 의존성 설치
npm install

# 3. 성능 측정
npx tsx scripts/measure-matching-performance.ts > performance-after.txt
```

#### Step 3: 결과 비교

```bash
# 차이점 확인
diff performance-before.txt performance-after.txt

# 또는 side-by-side 비교
diff -y performance-before.txt performance-after.txt

# 또는 GUI 도구 사용
code --diff performance-before.txt performance-after.txt
```

---

### 방법 3: 브라우저에서 측정

실제 사용자 환경과 가장 유사한 방법입니다.

#### Step 1: 개발 서버 실행

```bash
npm run dev
```

#### Step 2: 브라우저 콘솔에서 측정

```javascript
// 1. 홈 화면 매칭
console.time('Home Matches');
const homeResponse = await fetch('/api/match/results');
const homeData = await homeResponse.json();
console.timeEnd('Home Matches');
console.log('Results:', homeData.results.length);

// 2. 매칭 화면 (캐시 미스)
console.time('Match List (Cache Miss)');
const matchResponse1 = await fetch('/api/match/list?minScore=65&refresh=true');
const matchData1 = await matchResponse1.json();
console.timeEnd('Match List (Cache Miss)');
console.log('Results:', matchData1.results.length);

// 3. 매칭 화면 (캐시 히트)
console.time('Match List (Cache Hit)');
const matchResponse2 = await fetch('/api/match/list?minScore=65&refresh=false');
const matchData2 = await matchResponse2.json();
console.timeEnd('Match List (Cache Hit)');
console.log('Results:', matchData2.results.length);
```

---

## 📊 측정 결과 해석

### 응답 시간 기준

| 구분                  | 우수    | 양호      | 개선 필요 |
| --------------------- | ------- | --------- | --------- |
| 홈 화면 (캐시 히트)   | < 300ms | 300~500ms | > 500ms   |
| 매칭 화면 (캐시 히트) | < 500ms | 500~800ms | > 800ms   |
| 매칭 화면 (캐시 미스) | < 3s    | 3~5s      | > 5s      |

### 캐시 효율성 기준

| 지표           | 우수   | 양호   | 개선 필요 |
| -------------- | ------ | ------ | --------- |
| 캐시 히트율    | > 90%  | 70~90% | < 70%     |
| 속도 향상 배수 | > 10배 | 5~10배 | < 5배     |
| 개선율         | > 80%  | 50~80% | < 50%     |

---

## 🔍 문제 해결

### 문제: "TEST_USER_ID를 변경하세요" 오류

**원인:** 테스트 사용자 ID가 설정되지 않음

**해결:**

```typescript
// scripts/measure-matching-performance.ts
const TEST_USER_ID = 'YOUR_ACTUAL_USER_ID'; // 실제 UUID로 변경
```

### 문제: 환경 변수 오류

**원인:** `.env.local` 파일이 없거나 잘못 설정됨

**해결:**

```bash
# .env.local 파일 생성
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 문제: 캐시가 작동하지 않음

**원인:** DB 마이그레이션이 실행되지 않음

**해결:**

```sql
-- Supabase Dashboard > SQL Editor에서 실행
-- supabase/migrations/20260109_step1_match_cache.sql
-- supabase/migrations/20260109120000_step2_cache_context.sql
```

자세한 내용은 [CACHE_MIGRATION_GUIDE.md](../../CACHE_MIGRATION_GUIDE.md) 참고

### 문제: 측정 결과가 일관되지 않음

**원인:** 네트워크 상태, DB 부하, 동시 접속자 등의 영향

**해결:**

- 여러 번 측정 후 평균값 사용 (스크립트는 기본 5회 측정)
- 안정적인 네트워크 환경에서 측정
- 동시 접속자가 적은 시간대에 측정
- 첫 실행은 워밍업으로 간주하고 제외

---

## 💡 측정 팁

### 1. 일관된 환경 유지

- 같은 시간대에 측정
- 같은 네트워크 환경 사용
- 같은 테스트 데이터 사용

### 2. 충분한 샘플 수

- 최소 5회 이상 측정
- 평균값과 중앙값 모두 확인
- 이상치(outlier) 제거

### 3. 캐시 워밍업

- 첫 실행은 캐시 워밍업으로 간주
- 2회차부터 실제 측정값으로 사용

### 4. DB 상태 확인

```sql
-- 인덱스 확인
SELECT * FROM pg_indexes WHERE tablename = 'match_results_cache';

-- 통계 정보 업데이트
ANALYZE match_results_cache;
```

### 5. 프로덕션 환경 고려

- 로컬 환경과 프로덕션 환경의 차이 인지
- 네트워크 지연, CDN 캐싱 등의 영향 고려
- 실제 사용자 부하 시뮬레이션

---

## 📈 지속적인 모니터링

### Supabase Dashboard

```sql
-- 캐시 히트율
SELECT
  context,
  COUNT(*) as total_cached,
  AVG(EXTRACT(EPOCH FROM (NOW() - computed_at))) as avg_age_seconds
FROM match_results_cache
GROUP BY context;

-- 노출 이력 통계
SELECT
  COUNT(*) as total_exposures,
  COUNT(DISTINCT viewer_id) as unique_viewers,
  COUNT(DISTINCT target_id) as unique_targets
FROM match_exposure_log
WHERE exposed_at >= NOW() - INTERVAL '24 hours';
```

### 서버 측 로깅

API Route에 로깅 추가:

```typescript
// src/app/api/match/list/route.ts
const start = performance.now();
const results = await getMatchList(client, userId, options);
const duration = performance.now() - start;

console.log(
  `[Match List] User: ${userId}, Duration: ${duration.toFixed(2)}ms, Results: ${results.length}`
);
```

---

## 🎯 성능 목표

### 단기 목표 (현재 달성)

- ✅ 캐시 히트 시 500ms 이내 응답
- ✅ 실시간 계산 80% 감소
- ✅ DB 쿼리 70% 감소
- ✅ 매칭 다양성 확보

### 중기 목표 (향후 개선)

- [ ] 캐시 히트율 90% 이상
- [ ] 첫 로딩도 1초 이내 (백그라운드 캐싱)
- [ ] 실시간 계산 최적화 (병렬 처리)
- [ ] CDN 캐싱 도입

### 장기 목표

- [ ] 글로벌 엣지 캐싱
- [ ] 머신러닝 기반 매칭 예측
- [ ] 실시간 스트리밍 업데이트

---

## 📚 관련 문서

- [matching-performance-comparison.md](./matching-performance-comparison.md) - 성능 개선 전후 비교 상세
- [../../CACHE_MIGRATION_GUIDE.md](../../CACHE_MIGRATION_GUIDE.md) - 캐시 전략 상세
- [../database/04-table-details.md](../database/04-table-details.md) - DB 스키마

---

생성일: 2026-01-12
작성자: AI Assistant
버전: 1.0

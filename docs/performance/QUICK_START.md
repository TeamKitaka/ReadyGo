# 성능 측정 빠른 시작 가이드

매칭 시스템의 성능을 빠르게 측정하고 비교하는 방법입니다.

## ⚡ 5분 안에 시작하기

### 1단계: 테스트 사용자 ID 설정

```bash
# scripts/measure-matching-performance.ts 파일 열기
code scripts/measure-matching-performance.ts

# 3번째 줄 수정
const TEST_USER_ID = 'YOUR_TEST_USER_ID';  // ← 실제 UUID로 변경
```

**테스트 사용자 ID 찾기:**

```sql
-- Supabase Dashboard > SQL Editor에서 실행
SELECT id, nickname FROM user_profiles LIMIT 5;
```

---

### 2단계: 환경 변수 확인

`.env.local` 파일이 있는지 확인:

```bash
cat .env.local
```

없다면 생성:

```bash
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF
```

---

### 3단계: 성능 비교 실행

```bash
# 자동 비교 스크립트 실행 (권장)
./scripts/compare-performance.sh
```

**또는 수동 측정:**

```bash
# 현재 버전만 측정
npx tsx scripts/measure-matching-performance.ts
```

---

## 📊 결과 확인

### 터미널 출력 예시

```
╔═══════════════════════════════════════════════════╗
║       측정 결과 요약                              ║
╚═══════════════════════════════════════════════════╝

📊 응답 시간 (평균)
──────────────────────────────────────────────────
   홈 화면:              320.45ms
   매칭 화면 (캐시 미스): 4,523.12ms
   매칭 화면 (캐시 히트): 487.23ms

📈 성능 개선율
──────────────────────────────────────────────────
   캐시 효과: 89.2% 개선
   속도 향상: 9.3배

✅ 측정 완료!
```

---

## 🎯 결과 해석

### ✅ 좋은 결과

- 홈 화면: **< 300ms**
- 매칭 화면 (캐시 히트): **< 500ms**
- 캐시 효과: **> 80% 개선**
- 속도 향상: **> 8배**

### ⚠️ 개선 필요

- 홈 화면: **> 500ms**
- 매칭 화면 (캐시 히트): **> 800ms**
- 캐시 효과: **< 50% 개선**
- 속도 향상: **< 5배**

---

## 🔧 문제 해결

### ❌ "TEST_USER_ID를 변경하세요" 오류

```typescript
// scripts/measure-matching-performance.ts
const TEST_USER_ID = '실제-UUID-여기에-붙여넣기';
```

### ❌ 환경 변수 오류

```bash
# .env.local 파일 확인
ls -la .env.local

# 없으면 생성
cp .env.example .env.local
# 그리고 실제 값으로 수정
```

### ❌ 캐시가 작동하지 않음

```sql
-- Supabase Dashboard에서 실행
-- 1. 테이블 확인
SELECT * FROM match_results_cache LIMIT 1;

-- 2. 없으면 마이그레이션 실행
-- supabase/migrations/20260109_step1_match_cache.sql 내용 복사해서 실행
```

---

## 💡 다음 단계

### 더 자세한 분석

```bash
# 결과 파일 확인
cat performance-results/after_*.txt

# 비교 분석
diff performance-results/before_*.txt performance-results/after_*.txt
```

### 브라우저에서 직접 테스트

1. `npm run dev` 실행
2. 브라우저 개발자 도구 열기 (F12)
3. Network 탭에서 API 응답 시간 확인
4. Console 탭에서 직접 측정:

```javascript
console.time('Match List');
await fetch('/api/match/list?minScore=65');
console.timeEnd('Match List');
```

### 지속적인 모니터링

```sql
-- Supabase Dashboard에서 실행
-- 캐시 통계
SELECT
  context,
  COUNT(*) as cached_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - computed_at))) as avg_age_seconds
FROM match_results_cache
GROUP BY context;
```

---

## 📚 더 알아보기

- [README.md](./README.md) - 전체 성능 측정 가이드
- [matching-performance-comparison.md](./matching-performance-comparison.md) - 성능 개선 상세 분석
- [../../CACHE_MIGRATION_GUIDE.md](../../CACHE_MIGRATION_GUIDE.md) - 캐시 전략 가이드

---

## 🆘 도움이 필요하신가요?

1. **문서 확인**: [README.md](./README.md)의 문제 해결 섹션
2. **로그 확인**: `performance-results/` 폴더의 로그 파일
3. **캐시 상태 확인**: Supabase Dashboard > SQL Editor

---

생성일: 2026-01-12
작성자: AI Assistant
버전: 1.0

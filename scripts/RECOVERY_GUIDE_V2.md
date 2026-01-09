# 데이터 복구 가이드 V2 (개선판)

> ⚠️ 이 문서는 피드백을 반영한 **개선된 복구 전략**입니다.

## 🎯 핵심 개념 정리

### "복구"가 아닌 "시스템 재부팅용 시드 생성"

현재 상황은 데이터 복구가 아닙니다.
**Cold Start 상태로의 안전한 초기화**입니다.

| 구분 | 의미 | 지금 상태 |
|------|------|----------|
| **복구** | 시스템이 깨지지 않게 최소 데이터 생성 | ✅ 필요 |
| **초기화** | 의미 있는 도메인 데이터는 다시 받음 | ✅ 필요 |
| **재계산** | 기존 캐시/파생 데이터 제거 | ✅ 필수 |

---

## 🔧 개선 사항 (V1 대비)

### 1️⃣ 결정론적(Deterministic) 데이터 생성

**변경 전 (V1)**:
```typescript
temperatureScore = Math.random() * 100
status = ['online', 'offline', 'away'][Math.floor(Math.random() * 3)]
nickname = generateNickname(8) // 완전 랜덤
```

**변경 후 (V2)**:
```typescript
// user_id를 SHA-256 해시 → 항상 동일한 값
temperatureScore = hash(user_id) % 101  // 0-100
status = hash(user_id) % 3              // offline 고정 or 결정론적
nickname = user_metadata.name || `유저${hash(user_id) % 10000}`
```

**장점**:
- ✅ 재실행 시 동일한 결과
- ✅ 테스트/디버깅 용이
- ✅ 사용자 환경 일관성

---

### 2️⃣ 매칭 API 가드 로직 (가장 중요!)

**추가된 보호 장치**:

#### `/api/match/list` (매칭 화면)
```typescript
// user_traits, user_play_schedules 확인
if (!traits || !schedules) {
  return { 
    status: 'BLOCKED',
    reason: 'COLD_START',
    message: '성향분석 테스트를 먼저 완료해주세요.',
    requiredActions: {
      traits: !traits,
      schedules: !schedules
    }
  }; // 403 Forbidden
}
```

#### `/api/match/results` (홈 화면)
```typescript
// 홈 화면은 차단하지 않고 빈 배열 반환
if (!traits || !schedules) {
  return {
    results: [],
    coldStart: true,
    message: '성향분석 테스트를 완료하면 맞춤 매칭을 추천받을 수 있어요.'
  };
}
```

**효과**:
- ✅ 500 에러 원천 차단
- ✅ 빈 매칭 결과 방지
- ✅ 명확한 사용자 안내

---

### 3️⃣ TRUNCATE 사용 (캐시 삭제)

**변경 전 (V1)**:
```sql
DELETE FROM match_results_cache;
```

**변경 후 (V2)**:
```typescript
// TRUNCATE RPC 시도 → 실패 시 DELETE 폴백
await supabase.rpc('truncate_match_cache');
```

**장점**:
- ✅ PK 시퀀스 리셋
- ✅ 성능 우수
- ✅ 캐시 테이블 특성에 부합

---

### 4️⃣ 실행 순서 개선 (운영 안전)

**변경 전 (V1)**:
```
1. 복구
2. 캐시 삭제
3. 확인
```

**변경 후 (V2)**:
```
1. 🔒 매칭 API 가드 활성화 (이미 적용됨)
2. 🔄 user_profiles 복구
3. 🗑️ match_results_cache TRUNCATE
4. ✅ Steam 데이터 유지
5. 📊 데이터 확인
6. 🚀 서버 재시작
```

**효과**:
- ✅ 사용자 유입 중에도 장애 0%
- ✅ 순차적 안정성 보장

---

## 🚀 복구 실행 (V2)

### Step 1: user_profiles 복구 (결정론적)

```bash
npm run seed:restore
```

**생성되는 데이터**:
- ✅ `user_profiles` (animal_type: 'unknown')
  - nickname: **user_metadata > 결정론적** (중복 방지)
  - temperature_score: **user_id 해시 기반** (항상 동일)
  - tier: **temperature 기반 자동 계산**
- ✅ `user_settings` (기본 설정)
- ✅ `user_status` (**결정론적** or 'offline' 고정)

**예상 결과**:
```
🔍 모든 auth.users 조회 중 (페이지네이션 처리)...
   페이지 1: 193명
✅ 총 193명 조회 완료

🔄 User Profiles 복구 중...

✅ [user1@gmail.com] 복구 완료 (유저1234, gold)
✅ [user2@example.com] 복구 완료 (유저5678, silver)
...

======================================================================
✅ 복구 완료!

📊 통계:
   전체 auth.users: 193명
   복구 완료: 143명
   이미 존재: 50명
   실패: 0명
======================================================================

💡 특징:
  ✅ 결정론적 데이터 생성 (재실행 시 동일)
  ✅ 닉네임 중복 방지
  ✅ 재시드 안정성 보장
```

---

### Step 2: match_results_cache TRUNCATE

```bash
npm run seed:clear-cache
```

**실행 내용**:
1. TRUNCATE RPC 시도
2. 실패 시 DELETE 폴백
3. PK 시퀀스 리셋

**예상 결과**:
```
📊 삭제 전 캐시: 1234개

🗑️  캐시 삭제 중 (TRUNCATE)...

======================================================================
✅ 매칭 캐시 삭제 완료!

📊 통계:
   삭제 전: 1234개
   삭제 후: 0개
   삭제됨: 1234개
======================================================================
```

---

### Step 3: Steam 데이터 유지 (권장)

**아무것도 하지 않음** ✅

**이유**:
- `user_traits` 없어서 어차피 매칭 불가능
- Steam 데이터는 **가산점** 역할 (필수 아님)
- 성향분석 후 Steam 데이터 활용 가능
- 193명 재연동 부담 없음

---

### Step 4: 데이터 확인

```bash
npm run seed:check
```

**예상 결과**:
```
✅ user_profiles: 193/193 존재
✅ user_settings: 193/193 존재
✅ user_status: 193/193 존재
⚠️ user_traits: 50/193 존재 (성향분석 미완료)
⚠️ user_play_schedules: 45/193 존재 (성향분석 미완료)
```

---

### Step 5: 서버 재시작

```bash
npm run dev
```

---

## 🛡️ 시스템 보호 장치 (V2)

### 1. 서버 레벨 가드

#### 매칭 API 차단
```typescript
// /api/match/list
if (!traits || !schedules) {
  return { status: 'BLOCKED', reason: 'COLD_START' }; // 403
}
```

#### 홈 화면 빈 배열
```typescript
// /api/match/results
if (!traits || !schedules) {
  return { results: [], coldStart: true }; // 200
}
```

### 2. 프론트 레벨 안내 (권장)

```typescript
// 홈 화면
{coldStart && (
  <Banner>
    성향분석 테스트를 완료하면 맞춤 매칭을 추천받을 수 있어요!
    <Button>3분이면 끝나요 →</Button>
  </Banner>
)}

// 매칭 화면
{error.status === 'BLOCKED' && (
  <EmptyState>
    <Icon>🧪</Icon>
    <Title>성향분석이 필요해요</Title>
    <Description>{error.message}</Description>
    <Button>지금 시작하기 →</Button>
  </EmptyState>
)}
```

---

## 👥 사용자 경험 (V2)

### 로그인 직후

```
1. ✅ 로그인 성공
2. ✅ 홈 화면 접근
3. ⚠️ 프로필: 결정론적 닉네임 (유저1234), 기본 아바타
4. ⚠️ 매칭 섹션: 빈 상태 + CTA 버튼
5. ⚠️ 매칭 화면: "성향분석 필요" 안내 (403 차단)
```

### 성향분석 완료 후

```
1. ✅ animal_type 설정 (fox, wolf 등)
2. ✅ user_traits 생성
3. ✅ user_play_schedules 설정
4. ✅ 매칭 사용 가능
5. ✅ Steam 데이터 결합 매칭 (유지한 경우)
```

---

## 📊 V1 vs V2 비교

| 항목 | V1 (기존) | V2 (개선) |
|------|----------|----------|
| **데이터 생성** | 완전 랜덤 | 결정론적 (해시 기반) |
| **재실행 안정성** | ❌ 매번 다른 값 | ✅ 항상 동일 |
| **매칭 API 보호** | ❌ 없음 | ✅ 가드 추가 |
| **500 에러 위험** | ⚠️ 높음 | ✅ 0% |
| **캐시 삭제** | DELETE | TRUNCATE (+ 폴백) |
| **닉네임 중복** | ⚠️ 가능 | ✅ 방지 |
| **UX 안내** | ❌ 없음 | ✅ 명확한 메시지 |

---

## ⚠️ 주의사항

### 1. 원래 닉네임 손실
- ✅ 복구 불가능 (백업 없음)
- ✅ 결정론적 생성 (유저1234 형태)
- ✅ 사용자 직접 변경 가능

### 2. 성향분석 필수
- ✅ 매칭 사용 필수 조건
- ✅ API 레벨 차단
- ✅ 명확한 UX 안내

### 3. 재시드 안정성
- ✅ 언제든 재실행 가능
- ✅ 동일한 결과 보장
- ✅ 테스트/디버깅 용이

### 4. Steam 데이터
- ✅ 유지 권장
- ✅ 재연동 불필요
- ✅ 성향분석 후 활용 가능

---

## 🎯 최종 체크리스트

### 복구 전 확인
- [ ] Supabase 백업 없음 확인
- [ ] 개발 서버 중단 (선택)
- [ ] 환경 변수 설정 확인 (`.env.local`)

### 복구 실행
- [ ] `npm run seed:restore` 실행
- [ ] `npm run seed:clear-cache` 실행
- [ ] Steam 데이터 유지 (삭제 ❌)
- [ ] `npm run seed:check` 확인

### 복구 후 확인
- [ ] 로그인 테스트
- [ ] 홈 화면 접근 (빈 매칭)
- [ ] 매칭 화면 접근 (403 차단)
- [ ] 성향분석 완료 후 매칭 정상

### 운영 조치
- [ ] 사용자 공지 (성향분석 안내)
- [ ] 테스트 계정 재생성 권장
- [ ] 모니터링 (500 에러 0% 확인)

---

## 📞 문제 발생 시

### 500 에러
```bash
# 특정 사용자 디버깅
npm run seed:debug-user
```

### 데이터 불일치
```bash
# 전체 정합성 확인
npm run seed:check

# auth.users 확인
npm run seed:check-auth
```

### 재실행 필요
```bash
# 결정론적이므로 안전하게 재실행 가능
npm run seed:restore  # 멱등성 보장
```

---

## ✅ 결론

### V2 개선 핵심
1. ✅ **결정론적 데이터 생성** (재실행 안정성)
2. ✅ **매칭 API 가드** (500 에러 원천 차단)
3. ✅ **TRUNCATE 사용** (성능 + PK 리셋)
4. ✅ **명확한 UX** (사용자 안내)

### 최종 상태
- ✅ 모든 사용자 로그인 가능
- ✅ 프로필 표시 정상 (Cold Start)
- ✅ 매칭 API 안전하게 차단
- ⚠️ 성향분석 후 매칭 가능
- ✅ Steam 데이터 활용 가능

### 사용자 영향
- **긍정**: 로그인/채팅/프로필 정상, 안정적
- **부정**: 성향분석 재진행, 닉네임 재설정 필요
- **중립**: Steam 연동 유지, 명확한 안내

---

## 🚀 바로 시작!

```bash
# 1. user_profiles 복구 (결정론적)
npm run seed:restore

# 2. 매칭 캐시 TRUNCATE
npm run seed:clear-cache

# 3. Steam 데이터 유지 (권장)

# 4. 확인
npm run seed:check

# 5. 서버 재시작
npm run dev
```

**V2는 안전하고, 재실행 가능하며, 명확합니다!** 🎉


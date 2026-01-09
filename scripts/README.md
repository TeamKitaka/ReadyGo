# 테스트 유저 생성 스크립트

## 사용 방법

### 1. 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```bash
# 이미 있음
NEXT_PUBLIC_SUPABASE_URL=your-project-url

# 추가 필요 (Supabase Dashboard > Settings > API > service_role key)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**⚠️ 주의**: `service_role` 키는 **절대 클라이언트에 노출하면 안 됩니다**. 스크립트 실행용으로만 사용하세요.

### 2. 패키지 설치

```bash
npm install
```

### 3. 스크립트 실행

```bash
npm run seed:users
```

## 생성되는 데이터

### 📊 계정 구성 (총 150명)

#### 1️⃣ Cold Start (25명): test1 ~ test25
- **목적**: 성향 미분석 사용자 시뮬레이션
- **상태**: 회원가입만 완료
- **생성 테이블**:
  - ✅ auth.users
  - ✅ user_profiles (animal_type: **unknown**)
  - ✅ user_settings
  - ✅ user_status
  - ❌ user_traits (없음)
  - ❌ user_play_schedules (없음)

#### 2️⃣ 성향분석 완료 (125명): test26 ~ test150
- **목적**: 실제 사용자 시뮬레이션
- **상태**: 회원가입 + 성향분석 완료
- **생성 테이블**:
  - ✅ auth.users
  - ✅ user_profiles (동물 타입 자동 할당)
  - ✅ user_settings
  - ✅ user_status (online/offline/away 랜덤)
  - ✅ user_traits (동물별 성향 자동 생성)
  - ✅ user_play_schedules (2-4개 랜덤)
- **Steam 연동**: 이 중 100명에게 batch로 연동 예정

### 기본 정보
- **이메일**: `test1@readygo.test` ~ `test150@readygo.test`
- **비밀번호**: `Test1234!` (모든 계정 공통)
- **닉네임**: 랜덤 생성 (예: "귀여운고양이", "빠른늑대", "용감한호랑이")
  - 프로젝트 내 `generateNickname()` 함수 사용
  - 한국어 형용사 + 동물 조합

### 생성되는 테이블 데이터

#### Cold Start (test1~25)
1. **auth.users** ✅
2. **user_profiles** ✅ (animal_type: `unknown`)
3. **user_settings** ✅ (테마: dark, 알림: 모두 활성화)
4. **user_status** ✅ (online/offline/away 랜덤)

#### 성향분석 완료 (test26~150)
1. **auth.users** ✅
2. **user_profiles** ✅ (동물 타입 자동 할당, 18종)
3. **user_settings** ✅ (테마: dark, 알림: 모두 활성화)
4. **user_status** ✅ (online/offline/away 랜덤)
5. **user_traits** ✅ (동물별 성향 자동 생성)
   - 각 동물의 이상적 벡터 기준 ±10 변동
   - 예: Wolf → leadership 높음, Tiger → exploration 높음
6. **user_play_schedules** ✅ (2-4개 시간대 랜덤)

> 💡 **매칭 시스템 테스트 전략**
> - Cold Start: 기본 매칭 알고리즘 테스트
> - 성향분석 완료: 정교한 매칭 알고리즘 테스트
> - 이 중 100명에게 Steam 연동 예정 (batch 작업)

## 커스터마이징

### 생성 개수 변경

`scripts/seed-test-users.ts` 파일에서:

```typescript
const START = 1;
const END = 150; // 전체 계정 수
const COLD_START_COUNT = 25; // Cold Start 계정 수 (test1~25)
```

**예시**: 총 200명 중 40명 Cold Start
```typescript
const END = 200;
const COLD_START_COUNT = 40;
```

### 배치 크기 변경

```typescript
const BATCH_SIZE = 10; // 한 번에 처리할 개수 (기본 10명)
```

## 트러블슈팅

### Rate Limiting 에러

```
Error: Too many requests
```

→ `BATCH_SIZE`를 줄이거나 배치 간 대기 시간을 늘리세요:

```typescript
await new Promise((resolve) => setTimeout(resolve, 2000)); // 1초 → 2초
```

### Service Role Key 에러

```
❌ 환경 변수가 설정되지 않았습니다.
```

→ `.env.local` 파일에 `SUPABASE_SERVICE_ROLE_KEY`를 추가하세요.

Supabase Dashboard:
1. Settings > API
2. Project API keys 섹션
3. **service_role** key 복사

### 이메일 중복 에러

```
❌ Auth 생성 실패: User already registered
```

→ 이미 존재하는 이메일입니다. `START` 값을 변경하거나 기존 유저를 삭제하세요.

## 테스트 계정 삭제

Supabase Dashboard에서:
1. Authentication > Users
2. 필터: `test@readygo.test` 검색
3. 일괄 선택 후 삭제

또는 SQL:

```sql
-- ⚠️ 주의: 모든 테스트 계정 삭제
DELETE FROM auth.users WHERE email LIKE 'test%@readygo.test';
```

## 로그인 테스트

```
이메일: test1@readygo.test
비밀번호: Test1234!
```

## 성능

- **150명 생성**: 약 2-3분 소요
- **배치 처리**: 10명씩 처리, 배치 간 1초 대기
- **Rate limiting**: Supabase 제한에 맞게 자동 조절


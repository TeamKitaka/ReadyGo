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

### 기본 정보
- **이메일**: `test1@readygo.test` ~ `test150@readygo.test`
- **비밀번호**: `Test1234!` (모든 계정 공통)
- **닉네임**: 랜덤 생성 (예: "귀여운고양이", "빠른늑대", "용감한호랑이")
  - 프로젝트 내 `generateNickname()` 함수 사용
  - 한국어 형용사 + 동물 조합
- **동물 타입**: 18종 중 랜덤

### 생성되는 테이블 데이터
1. **auth.users** (Supabase Auth)
2. **user_profiles** (프로필 정보)
3. **user_traits** (동물 타입에 맞는 성향 점수 자동 생성)
   - 각 동물의 이상적 벡터 기준 ±10 변동
   - 예: Wolf → leadership 높음, Tiger → exploration 높음
4. **user_play_schedules** (플레이 시간대 2-4개 랜덤)

## 커스터마이징

### 생성 개수 변경

`scripts/seed-test-users.ts` 파일에서:

```typescript
const START = 1;
const END = 150; // 원하는 개수로 변경 (예: 200)
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


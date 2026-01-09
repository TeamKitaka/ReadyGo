# Steam ID 연동 스크립트

## 개요

test26~test125 (100명)의 테스트 계정에 Steam ID를 일괄 연동하는 스크립트입니다.

## 사전 준비

### 1. 환경 변수 설정

`.env.local` 파일에 다음 환경 변수가 필요합니다:

```bash
# 이미 있음
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 추가 필요
ADMIN_API_KEY=your-admin-api-key
```

**ADMIN_API_KEY 설정 방법**:
- 임의의 안전한 문자열 생성 (예: `admin_key_abc123xyz`)
- `.env.local`에 추가
- 프로덕션 환경에서는 절대 사용 금지

### 2. 개발 서버 실행 필수!

이 스크립트는 **개발 서버를 통해 API를 호출**하므로, 반드시 먼저 실행해야 합니다:

```bash
npm run dev
```

### 3. 테스트 계정 생성 확인

Steam을 연동할 test26~test125 계정이 먼저 생성되어 있어야 합니다:

```bash
npm run seed:users
```

## 사용 방법

### 1. 새 터미널 열기

개발 서버는 계속 실행 중이어야 하므로, **새 터미널**을 엽니다.

### 2. 스크립트 실행

```bash
npm run seed:steam
```

## 동작 방식

```
┌─────────────────────┐
│  test26~test125     │  ← 성향분석 완료 계정 (125명)
│  (100명)            │
└──────────┬──────────┘
           │
           │ 1. userId 조회
           ↓
┌─────────────────────┐
│  Steam ID 100개     │  ← 제공된 Steam ID
└──────────┬──────────┘
           │
           │ 2. 매핑
           ↓
┌─────────────────────┐
│  bulk-link API      │  ← POST /api/admin/steam/bulk-link
│  (개발 서버)         │
└──────────┬──────────┘
           │
           │ 3. 연동
           ↓
┌─────────────────────┐
│  user_profiles      │
│  steam_id 업데이트   │
└─────────────────────┘
```

## 결과 확인

### 성공 시

```
🚀 Steam ID 연동 시작...
📊 연동 대상: test26~test125 (100명)
🎮 Steam ID: 100개

📋 Step 1: 테스트 계정 조회 중...
✅ 100명의 계정 발견

🔗 Step 2: Steam ID 매핑 완료 (100명)

🚀 Step 3: Bulk-link API 호출 중...

============================================================
✅ 완료!

📊 총 100명 처리
✅ 성공: 100명
❌ 실패: 0명
============================================================
```

### 데이터베이스 확인

```sql
-- Steam 연동된 계정 확인
SELECT 
  id,
  nickname,
  steam_id,
  email
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE email LIKE 'test%@readygo.test'
  AND steam_id IS NOT NULL
ORDER BY email;
```

## 트러블슈팅

### ❌ fetch failed 에러

```
💥 오류 발생: fetch failed
```

**원인**: 개발 서버가 실행되지 않음

**해결**:
```bash
# 터미널 1에서
npm run dev

# 터미널 2에서
npm run seed:steam
```

### ❌ invalid_api_key 에러

```
❌ API 호출 실패: 401
```

**원인**: ADMIN_API_KEY가 설정되지 않았거나 잘못됨

**해결**:
1. `.env.local` 파일에 `ADMIN_API_KEY` 추가
2. 개발 서버 재시작 (`npm run dev`)

### ❌ user_not_found 에러

```
❌ 실패한 케이스:
  1. xxx-xxx-xxx: 존재하지 않는 유저입니다. (user_not_found)
```

**원인**: test26~test125 계정이 생성되지 않음

**해결**:
```bash
npm run seed:users
```

### ❌ duplicate_steam_id 에러

```
❌ 이 Steam ID는 이미 다른 유저에게 연결되어 있습니다.
```

**원인**: Steam ID 중복

**해결**:
1. 이미 연동된 경우: 정상 (다시 실행하지 않아도 됨)
2. 강제로 덮어쓰려면: 스크립트의 `force: false` → `force: true`

## 최종 계정 구성

### 전체 150개 계정

| 범위 | 타입 | 성향분석 | Steam 연동 | 인원 |
|------|------|---------|-----------|------|
| test1~25 | ❄️ Cold Start | ❌ | ❌ | 25명 |
| test26~125 | 🎮 완전체 | ✅ | ✅ | 100명 |
| test126~150 | 🎯 성향만 | ✅ | ❌ | 25명 |

### 매칭 테스트 시나리오

1. **Cold Start (test1~25)**: 기본 매칭만
2. **성향만 (test126~150)**: 성향 기반 매칭
3. **완전체 (test26~125)**: 성향 + 게임 기반 정교한 매칭

## 스크립트 커스터마이징

### Steam ID 추가/변경

`scripts/link-steam-to-test-users.ts` 파일에서:

```typescript
const STEAM_IDS = [
  "76561198842603734",
  "76561198023414915",
  // ... 원하는 Steam ID 추가
];
```

### 연동 대상 계정 변경

```typescript
// test26~test125 대신 다른 범위
const emails = Array.from({ length: 50 }, (_, i) => `test${i + 1}@readygo.test`);
```

## 참고

- **API 문서**: `src/app/api/admin/steam/bulk-link/route.ts`
- **관련 테이블**:
  - `user_profiles.steam_id`
  - `steam_sync_logs`
- **최대 처리 개수**: 100개 (bulk-link API 제한)


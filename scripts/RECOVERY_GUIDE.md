# 데이터 복구 가이드

## 📋 복구 계획 요약

### 삭제된 데이터
- ❌ user_profiles (143개)
- ❌ user_settings (114개)
- ❌ user_status (106개)
- ❌ user_traits (87개)
- ❌ user_play_schedules (59명분)

### 남아있는 데이터
- ✅ auth.users (193개)
- ✅ steam_user_games
- ✅ steam_user_stats
- ✅ chat_rooms, chat_messages
- ✅ parties, party_members

---

## 🎯 복구 전략

### 1️⃣ user_profiles 복구
- animal_type: **'unknown'** (Cold Start 상태)
- nickname: 랜덤 생성 (원래 닉네임 손실)
- tier, temperature_score: 자동 생성

### 2️⃣ match_results_cache 삭제
- 무효한 캐시 제거 (필수)

### 3️⃣ Steam 데이터 유지 (권장)
- steam_user_games, steam_user_stats 유지
- Steam 재연동 부담 감소
- 성향분석 후 Steam 기반 매칭 가능

---

## 🚀 복구 실행 단계

### Step 1: user_profiles 복구

```bash
npm run seed:restore
```

**예상 결과**:
```
✅ [user1@gmail.com] 복구 완료 (닉네임, gold)
✅ [user2@example.com] 복구 완료 (닉네임, silver)
...

======================================================================
✅ 복구 완료!

📊 통계:
   전체 auth.users: 193명
   복구 완료: 143명
   이미 존재: 50명
   실패: 0명
======================================================================
```

**복구되는 데이터**:
- ✅ user_profiles (animal_type: 'unknown')
- ✅ user_settings (기본 설정)
- ✅ user_status (랜덤 온라인 상태)

---

### Step 2: match_results_cache 삭제 (필수)

```bash
npm run seed:clear-cache
```

**예상 결과**:
```
📊 삭제 전 캐시: 1234개

🗑️  캐시 삭제 중...

======================================================================
✅ 매칭 캐시 삭제 완료!

📊 통계:
   삭제 전: 1234개
   삭제 후: 0개
   삭제됨: 1234개
======================================================================
```

**이유**:
- 삭제된 user_profiles, user_traits 기반 캐시 무효
- 다음 매칭 요청 시 자동으로 새로운 캐시 생성

---

### Step 3: Steam 데이터 처리 (선택)

#### Option A: Steam 데이터 유지 (권장)

**아무것도 하지 않음**

**장점**:
- ✅ Steam 연동 상태 유지
- ✅ 게임 목록 보존
- ✅ 성향분석 후 Steam 기반 매칭 가능
- ✅ 사용자 재연동 불필요

**단점**:
- ⚠️ 데이터 일관성 우려 (옛날 데이터)

#### Option B: Steam 데이터 삭제 (선택)

```bash
FORCE_DELETE=yes npm run seed:clear-steam
```

**장점**:
- ✅ 깨끗한 초기화
- ✅ 데이터 일관성 보장

**단점**:
- ❌ Steam 재연동 필요 (사용자 불편)
- ❌ Steam API Rate Limit 우려 (193명)

---

## 📊 복구 후 시스템 상태

### 로그인 & 인증
- ✅ 모든 사용자 로그인 가능
- ✅ OAuth (Google) 정상 작동
- ✅ 세션 유지 정상

### 프로필
- ✅ 프로필 페이지 정상 표시
- ⚠️ animal_type: 'unknown' (기본 아바타)
- ⚠️ nickname: 랜덤 생성 (사용자 재설정 필요)
- ✅ tier, temperature_score: 자동 생성

### 매칭
- ❌ 매칭 불가능 (user_traits 없음)
- ⚠️ "성향분석 테스트를 먼저 진행해주세요" 안내
- ✅ 성향분석 완료 후 매칭 가능

### 채팅
- ✅ 채팅방 목록 정상
- ✅ 메시지 기록 정상
- ✅ 상대방 정보 표시 정상

### 파티
- ✅ 파티 목록 정상
- ✅ 파티원 정보 표시 정상
- ⚠️ 파티원 animal_type 'unknown' 표시 가능

### Steam
- ✅ Steam 연동 상태 유지 (유지한 경우)
- ✅ 게임 목록 정상 표시
- ✅ 성향분석 후 Steam 기반 매칭 가능

---

## 👥 사용자 경험 흐름

### 로그인 직후
```
1. ✅ 로그인 성공
2. ✅ 홈 화면 접근
3. ⚠️ 프로필: 랜덤 닉네임, 기본 아바타 (unknown)
4. ⚠️ 매칭: "성향분석 테스트를 먼저 진행해주세요"
```

### 성향분석 완료 후
```
1. ✅ animal_type 설정 (fox, wolf 등)
2. ✅ user_traits 생성
3. ✅ user_play_schedules 설정
4. ✅ 매칭 사용 가능
5. ✅ Steam 데이터 결합 매칭 (Steam 유지 시)
```

---

## ⚠️ 주의사항

### 1. 원래 닉네임 손실
- 복구 불가능
- 랜덤 생성된 닉네임 사용
- 사용자가 직접 변경 필요

### 2. 성향분석 필수
- 매칭 사용을 위해 필수
- 모든 사용자가 재진행 필요
- Cold Start 상태에서는 매칭 불가능

### 3. 테스트 계정 재생성 권장
- test1@readygo.test ~ test150@readygo.test
- 기존 테스트 계정 삭제 후 재생성 가능
- `seed:users` 스크립트로 재생성

### 4. 실제 사용자 안내
- 성향분석 테스트 진행 안내
- 닉네임 재설정 안내 (원하는 경우)
- Steam 재연동 안내 (Steam 삭제한 경우)

---

## 🔍 복구 확인

### 1. 데이터베이스 확인
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

### 2. 특정 사용자 확인
```bash
npm run seed:debug-user
```

`scripts/debug-user.ts`에서 `TARGET_USER_ID` 수정 후 실행

### 3. 웹 접속 테스트
1. 로그인
2. 프로필 확인
3. 매칭 화면 접근 → 성향분석 안내 확인

---

## 🎯 권장 복구 순서

```bash
# 1. user_profiles 복구 (필수)
npm run seed:restore

# 2. match_results_cache 삭제 (필수)
npm run seed:clear-cache

# 3. Steam 데이터 삭제 (선택, 권장 안 함)
# FORCE_DELETE=yes npm run seed:clear-steam

# 4. 데이터 확인
npm run seed:check

# 5. 개발 서버 재시작
npm run dev
```

---

## 💡 장기 계획

### 테스트 계정 재생성
```bash
# 1. 기존 테스트 계정 삭제 (test1~150)
# Supabase Dashboard에서 수동 삭제

# 2. 새로운 테스트 계정 생성
npm run seed:users  # 150명

# 3. Steam 연동 (선택)
npm run seed:steam  # test26~125 (100명)
```

### 실제 사용자 관리
- Google OAuth 사용자는 유지
- Cold Start 상태로 복구됨
- 성향분석 테스트 진행 안내 필요

---

## 📞 문제 발생 시

### 500 에러
```bash
# 특정 사용자 디버깅
npm run seed:debug-user
```

`scripts/debug-user.ts`에서 `TARGET_USER_ID` 수정 후 확인

### 데이터 불일치
```bash
# 전체 데이터 정합성 확인
npm run seed:check

# auth.users 확인
npm run seed:check-auth
```

### 고아 데이터 재발견
```bash
# 고아 데이터 제거 (주의: 페이지네이션 처리됨)
npm run seed:cleanup
```

⚠️ `seed:cleanup`은 조심히 사용하세요!
- 페이지네이션 처리가 올바른지 재확인 필요
- 백업 권장

---

## ✅ 결론

### 최종 복구 상태
- ✅ 모든 사용자 로그인 가능
- ✅ 프로필 표시 정상 (Cold Start)
- ⚠️ 성향분석 후 매칭 가능
- ✅ Steam 데이터 활용 가능 (유지 시)

### 사용자 액션 필요
1. 닉네임 재설정 (원하는 경우)
2. 성향분석 테스트 진행 (필수)
3. Steam 재연동 (Steam 삭제 시)

### 관리자 액션 필요
1. 테스트 계정 재생성 권장
2. 실제 사용자에게 안내 메일/공지
3. Cold Start 상태 UX 확인


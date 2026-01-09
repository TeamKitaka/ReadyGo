# 데이터 복구 영향도 분석

## 📊 현재 상황

### 삭제된 데이터

- ❌ `user_profiles` (143개): 닉네임, animal_type, tier, temperature_score 등
- ❌ `user_settings` (114개): 테마, 알림 설정 등
- ❌ `user_status` (106개): 온라인 상태
- ❌ `user_traits` (87개): 성향 점수 (cooperation, exploration 등)
- ❌ `user_play_schedules` (59명분): 플레이 시간대

### 남아있는 데이터

- ✅ `auth.users` (193개): 인증 정보, 이메일, 비밀번호
- ✅ `steam_user_games` (유지): Steam 게임 목록
- ✅ `steam_user_stats` (유지): Steam 통계 (플레이 스타일, 장르 등)
- ✅ `match_results_cache` (유지): 매칭 캐시
- ✅ `chat_rooms`, `chat_messages` (유지): 채팅 데이터

---

## 🔧 복구 계획

### 1️⃣ user_profiles 복구

```typescript
{
  id: userId,
  nickname: generateNickname() or user_metadata.name,
  animal_type: 'unknown',  // ⚠️ Cold Start 상태
  tier: 자동 계산 (온도 기반),
  temperature_score: 랜덤 생성,
  bio: 기본 bio,
  avatar_url: user_metadata.avatar_url or null
}
```

### 2️⃣ user_settings 복구

```typescript
{
  theme_mode: 'dark',
  notification_push: true,
  notification_chat: true,
  notification_party: true,
  language: 'ko'
}
```

### 3️⃣ user_status 복구

```typescript
{
  status: 'online' | 'offline' | 'away'(랜덤);
}
```

### 4️⃣ steam_user_games, steam_user_stats 삭제 여부

**검토 필요**: 캐시 의미 없으므로 삭제 고려

---

## 📋 도메인별 영향도 분석

### 1. 🔐 Auth (인증/회원가입)

**영향**: ✅ 없음

- `auth.users` 살아있음
- 로그인 정상 작동
- OAuth (Google) 정상 작동

**복구 후**:

- ✅ 모든 사용자 로그인 가능
- ✅ 세션 유지 정상

---

### 2. 👤 Profile (프로필)

**영향**: ⚠️ 중간

#### 삭제된 데이터 영향

- `animal_type`: UI 표시, 아바tar 이미지에 사용
- `nickname`: 프로필 이름 표시
- `tier`, `temperature_score`: 프로필 배지 표시

#### 복구 후

- ✅ 프로필 페이지 정상 표시
- ⚠️ `animal_type: 'unknown'` → 기본 아바타 표시
- ⚠️ `nickname`: 랜덤 생성 (원래 닉네임 손실)
- ✅ `tier`, `temperature_score`: 새로 생성

**사용자 액션 필요**:

- 닉네임 재설정 (원하는 경우)
- 성향분석 테스트 진행

---

### 3. 🎯 Match (매칭 시스템)

**영향**: 🚨 높음

#### 매칭 계산에 필요한 데이터

##### 필수 데이터 (없으면 매칭 불가)

1. **`user_traits`** (❌ 삭제됨)
   - cooperation, exploration, strategy, leadership, social
   - 매칭 점수 계산의 핵심
   - **영향**: 매칭 불가능

2. **`user_play_schedules`** (❌ 삭제됨)
   - 플레이 시간대 매칭에 사용
   - **영향**: 시간대 매칭 불가능

##### 선택 데이터 (없어도 매칭 가능, Cold Start 처리)

3. **`steam_user_stats`** (✅ 남아있음)
   - play_style, main_genres
   - 매칭 점수 가산점
   - **영향**: 없음 (데이터 유지)

4. **`steam_user_games`** (✅ 남아있음)
   - 공통 게임 매칭
   - **영향**: 없음 (데이터 유지)

#### animal_type의 매칭 영향

```typescript
// buildMatchContext.service.ts
const animalType = profileData?.animal_type ?? undefined;
return { traits, animalType };
```

**결론**: `animal_type`은 **매칭 점수 계산에 직접 사용되지 않음**

- 주로 UI 표시용 (아바타, 동물 타입 뱃지)
- 매칭 계산은 `traits` 수치만 사용

#### 복구 후 매칭 상태

- ❌ **매칭 불가능** (`user_traits` 없음)
- ❌ **시간대 매칭 불가능** (`user_play_schedules` 없음)
- ✅ **Steam 기반 매칭**: 가능 (데이터 유지)

**사용자 액션 필요**:

- 성향분석 테스트 필수 진행
- 플레이 시간대 설정 필수 진행

---

### 4. 💬 Chat (채팅)

**영향**: ✅ 없음

- `chat_rooms`, `chat_messages` 살아있음
- 채팅 기록 그대로 유지
- 프로필 정보는 user_profiles에서 조회 (복구됨)

**복구 후**:

- ✅ 채팅방 목록 정상
- ✅ 메시지 기록 정상
- ✅ 상대방 닉네임/아바타 표시 정상 (복구된 user_profiles 사용)

---

### 5. 🎮 Party (파티)

**영향**: ⚠️ 중간

- `parties`, `party_members` 살아있을 가능성 높음
- 프로필 정보는 user_profiles에서 조회 (복구됨)

**복구 후**:

- ✅ 파티 목록 정상
- ✅ 파티원 정보 표시 정상 (복구된 user_profiles 사용)
- ⚠️ 파티원의 animal_type이 'unknown'으로 표시될 수 있음

---

### 6. 🎮 Steam (Steam 연동)

**영향**: ⚠️ 삭제 여부에 따라 다름

#### 현재 상태 (삭제하지 않은 경우)

- ✅ `steam_user_games`: 게임 목록 유지
- ✅ `steam_user_stats`: 플레이 스타일, 장르 유지
- ✅ `user_profiles.steam_id`: Steam ID 유지 (복구됨)

**복구 후**:

- ✅ Steam 연동 상태 유지
- ✅ 게임 목록 정상 표시
- ✅ 매칭 시 Steam 데이터 활용 가능

#### steam 데이터 삭제하는 경우

- ❌ `steam_user_games` 삭제
- ❌ `steam_user_stats` 삭제
- ❌ `user_profiles.steam_id` NULL 처리

**복구 후**:

- ⚠️ Steam 연동 해제 상태
- ⚠️ 게임 목록 없음
- ⚠️ Steam 기반 매칭 불가능

**사용자 액션 필요**:

- Steam 재연동 필요
- 게임 목록 재동기화 필요

---

### 7. 🎯 Traits (성향분석)

**영향**: 🚨 높음

- `user_traits` 삭제됨
- `animal_type: 'unknown'`으로 초기화

**복구 후**:

- ❌ 성향 데이터 없음
- ❌ 동물 타입 초기화
- ⚠️ 성향분석 테스트 페이지로 리다이렉트

**사용자 액션 필요**:

- 성향분석 테스트 **필수** 진행

---

### 8. ⭐ Review (리뷰)

**영향**: ⚠️ 중간

- `reviews` 테이블 살아있을 가능성 높음
- 리뷰 작성자/대상자 프로필은 user_profiles에서 조회

**복구 후**:

- ✅ 리뷰 기록 유지
- ✅ 리뷰 표시 정상
- ⚠️ 작성자/대상자의 animal_type이 'unknown'으로 표시

---

### 9. 🗂️ match_results_cache (매칭 캐시)

**영향**: 🚨 높음

#### 현재 상태

- `match_results_cache` 테이블 살아있음
- 하지만 대상 user의 `user_profiles`, `user_traits`가 삭제됨
- **캐시된 매칭 결과가 유효하지 않음**

#### 문제점

```typescript
// 캐시에 저장된 데이터
{
  viewer_id: 'user1',
  target_id: 'user2',  // ← user2의 user_profiles, user_traits 삭제됨!
  score: 85,
  reasons: [...],      // ← 옛날 데이터 기반
  tags: [...]          // ← 옛날 데이터 기반
}
```

**복구 후**:

- ⚠️ **캐시 데이터 무효**: 삭제된 사용자 데이터 기반
- ⚠️ **500 에러 가능성**: 캐시된 target_id의 프로필이 없거나 Cold Start 상태
- ⚠️ **부정확한 매칭**: 옛날 성향 데이터로 계산된 점수

**권장 조치**:

```sql
-- 전체 매칭 캐시 삭제
DELETE FROM match_results_cache;
```

---

## 🎯 steam_user_games, steam_user_stats 삭제 여부

### Option A: 유지 (권장)

**장점**:

- ✅ Steam 연동 상태 유지
- ✅ 게임 목록 보존
- ✅ Steam 기반 매칭 가능 (성향분석 후)
- ✅ 사용자 편의성 높음

**단점**:

- ⚠️ 성향분석 전까지 매칭 불가능 (어차피 user_traits 없음)
- ⚠️ 데이터 일관성 우려 (옛날 데이터)

### Option B: 삭제

**장점**:

- ✅ 깨끗한 초기화
- ✅ 데이터 일관성 보장
- ✅ 모든 사용자가 동일한 Cold Start 상태

**단점**:

- ❌ Steam 재연동 필요 (사용자 불편)
- ❌ 게임 목록 재동기화 필요
- ❌ Steam API Rate Limit 우려 (193명 동시 동기화)

### 🤔 권장 사항

**Option A (유지) 권장**

이유:

1. `user_traits`가 없어서 어차피 매칭 불가능
2. Steam 데이터는 매칭에 가산점 역할 (필수 아님)
3. 성향분석 후 Steam 데이터를 다시 활용 가능
4. 사용자 재연동 부담 감소

**단, match_results_cache는 반드시 삭제**

---

## ✅ 최종 복구 플랜

### 1단계: user_profiles 복구

```bash
npm run seed:restore
```

- user_profiles, user_settings, user_status 생성
- animal_type: 'unknown' (Cold Start)
- nickname: 랜덤 생성 (원래 닉네임 손실)

### 2단계: match_results_cache 삭제

```sql
DELETE FROM match_results_cache;
```

- 무효한 캐시 제거
- 다음 매칭 시 재계산

### 3단계: steam 데이터 유지 (권장)

- steam_user_games, steam_user_stats **유지**
- user_profiles.steam_id **유지** (복구 스크립트에서 자동 처리 안 함)

### 4단계: 사용자 안내

- 로그인 가능
- 프로필 표시 정상
- **성향분석 테스트 필수 진행** 안내
- 매칭 사용 전 성향분석 완료 필요

---

## 📊 예상 사용자 경험

### 로그인 직후

1. ✅ 로그인 성공
2. ✅ 홈 화면 접근
3. ⚠️ 프로필: 랜덤 닉네임, 기본 아바타 (unknown)
4. ⚠️ 매칭: "성향분석 테스트를 먼저 진행해주세요" 안내

### 성향분석 완료 후

1. ✅ animal_type 설정됨 (fox, wolf 등)
2. ✅ user_traits 생성됨
3. ✅ user_play_schedules 설정됨
4. ✅ 매칭 사용 가능
5. ✅ Steam 데이터와 결합된 매칭 (Steam 연동 유지한 경우)

---

## 🚨 주의사항

### 1. 닉네임 손실

- 원래 닉네임 복구 불가능
- 랜덤 생성된 닉네임
- 사용자가 직접 변경 필요

### 2. 성향분석 필수

- 매칭 사용을 위해 필수
- 모든 사용자가 재진행 필요
- Cold Start 상태에서는 매칭 불가능

### 3. 데이터 일관성

- match_results_cache 반드시 삭제
- 옛날 데이터 기반 캐시는 무효

### 4. Steam 연동

- 유지 권장
- 삭제 시 193명의 재연동 부담
- Steam API Rate Limit 고려

---

## 💡 결론

### 권장 복구 방법

1. **user_profiles 복구**: `npm run seed:restore`
2. **match_results_cache 삭제**: `DELETE FROM match_results_cache;`
3. **steam 데이터 유지**: 삭제하지 않음
4. **사용자 안내**: 성향분석 테스트 진행 유도

### 최종 상태

- ✅ 모든 사용자 로그인 가능
- ✅ 프로필 표시 정상 (Cold Start)
- ⚠️ 성향분석 후 매칭 가능
- ✅ Steam 데이터 활용 가능 (유지 시)

### 사용자 영향

- **긍정**: 로그인/채팅/프로필 정상
- **부정**: 성향분석 재진행, 닉네임 재설정 필요
- **중립**: Steam 연동 유지 (유지 시)

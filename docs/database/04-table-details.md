# Table Details(ReadyGo)

본 문서는 ReadyGo 서비스의 public schema 전체 테이블(39개)에 대한 상세 정의 문서이다.

### Source of Truth (SSOT)

1. Supabase 실제 DB
2. database.types.ts
3. 01-schema-analysis.md

📌 본 문서는 컬럼 단위 사실 문서이며,
ERD 구조는 02-domain-erd.md, 03-full-erd.md를 참고한다.

---

### 공통 규칙

- 타입 기준: `database.types.ts`의 Row타입
- Nullable: `| null` 존재 여부 기준
- 기본값(default): 타입 파일에 명시된 경우만 기록
- `auth.users`는 논리적 연결이며 FK로 표기하지 않음

---

### 1️⃣ User / Profile Domain

#### 1. user_profiles

- 유저의 핵심 프로필 정보

| Column            | Type        | Nullable | Description                      |
| ----------------- | ----------- | -------- | -------------------------------- |
| id                | uuid        | ❌       | 유저 ID (auth.users와 논리 연결) |
| nickname          | text        | ⭕       | 닉네임                           |
| bio               | text        | ⭕       | 자기소개                         |
| avatar_url        | text        | ⭕       | 프로필 이미지                    |
| animal_type       | text        | ❌       | 성향 동물 타입                   |
| steam_id          | text        | ⭕       | Steam 계정 ID                    |
| tier              | text        | ❌       | 현재 티어                        |
| temperature_score | numeric     | ❌       | 온도 점수                        |
| status_message    | text        | ⭕       | 상태 메시지                      |
| created_at        | timestamptz | ⭕       | 생성 시각                        |
| updated_at        | timestamptz | ⭕       | 수정 시각                        |

#### 2. user_settings

- 유저 환경 설정

| Column             | Type        | Nullable | Description    |
| ------------------ | ----------- | -------- | -------------- |
| id                 | uuid        | ❌       | 유저 ID        |
| theme_mode         | text        | ⭕       | 테마 설정      |
| notification_push  | boolean     | ⭕       | 푸시 알림 여부 |
| notification_chat  | boolean     | ⭕       | 채팅 알림 여부 |
| notification_party | boolean     | ⭕       | 파티 알림 여부 |
| language           | text        | ⭕       | 언어 설정      |
| created_at         | timestamptz | ⭕       | 생성 시각      |
| updated_at         | timestamptz | ⭕       | 수정 시각      |

#### 3. user_status

- 유저 온라인 상태

| Column     | Type                        | Nullable | Description                                    |
| ---------- | --------------------------- | -------- | ---------------------------------------------- |
| user_id    | uuid                        | ❌       | 유저 ID                                        |
| status     | user_presence_status (enum) | ❌       | 온라인 상태 (online \| away \| dnd \| offline) |
| updated_at | timestamptz                 | ❌       | 상태 변경 시각                                 |

#### 4. user_traits

- 유저 성향 점수 벡터

| Column      | Type        | Nullable | Description    |
| ----------- | ----------- | -------- | -------------- |
| id          | bigint      | ❌       | PK             |
| user_id     | uuid        | ⭕       | 유저           |
| cooperation | int         | ❌       | 협동 성향 점수 |
| exploration | int         | ❌       | 탐험 성향 점수 |
| strategy    | int         | ❌       | 전략 성향 점수 |
| leadership  | int         | ❌       | 리더십 점수    |
| social      | int         | ❌       | 교류 성향 점수 |
| updated_at  | timestamptz | ⭕       | 수정 시각      |

#### 5. user_play_schedules

- 유저 플레이 성향 테이블

| Column     | Type        | Nullable | Description                       |
| ---------- | ----------- | -------- | --------------------------------- |
| id         | bigint      | ❌       | PK                                |
| user_id    | uuid        | ❌       | 유저                              |
| day_type   | text        | ❌       | weekday, weekend                  |
| time_slot  | text        | ❌       | dawn, morning, afternoon, evening |
| created_at | timestamptz | ❌       | 생성 시각                         |

#### 6. user_social_links

- 유저 외부 링크

| Column     | Type        | Nullable | Description |
| ---------- | ----------- | -------- | ----------- |
| id         | bigint      | ❌       | PK          |
| user_id    | uuid        | ⭕       | 유저        |
| platform   | text        | ⭕       | 플랫폼      |
| url        | text        | ⭕       | 링크 URL    |
| created_at | timestamptz | ⭕       | 생성 시각   |

#### 7. user_tags

- 유저-태그 매핑

| Column     | Type        | Nullable | Description |
| ---------- | ----------- | -------- | ----------- |
| id         | bigint      | ❌       | PK          |
| user_id    | uuid        | ⭕       | 유저        |
| tag_id     | bigint      | ⭕       | 태그 ID     |
| created_at | timestamptz | ⭕       | 생성 시각   |

#### 8. tags

- 태그 마스터

| Column     | Type        | Nullable | Description |
| ---------- | ----------- | -------- | ----------- |
| id         | bigint      | ❌       | PK          |
| name       | text        | ⭕       | 태그 이름   |
| created_at | timestamptz | ⭕       | 생성 시각   |

#### 9. user_reports

- 유저 신고

| Column         | Type        | Nullable | Description |
| -------------- | ----------- | -------- | ----------- |
| id             | bigint      | ❌       | PK          |
| reporter_id    | uuid        | ⭕       | 신고자      |
| target_user_id | uuid        | ⭕       | 신고 대상   |
| type           | text        | ⭕       | 신고 유형   |
| comment        | text        | ⭕       | 신고 내용   |
| created_at     | timestamptz | ⭕       | 신고 시각   |

#### 10. user_blocks

- 유저 차단

| Column          | Type        | Nullable | Description    |
| --------------- | ----------- | -------- | -------------- |
| id              | bigint      | ❌       | PK             |
| user_id         | uuid        | ⭕       | 차단한 유저    |
| blocked_user_id | uuid        | ⭕       | 차단 대상 유저 |
| created_at      | timestamptz | ⭕       | 차단 시각      |

---

### 2️⃣ Chat Domain

- 1:1 및 그룹 채팅 구조
- 채팅방, 참여자, 메시지, 읽음 상태 포함

#### 11. chat_rooms

- 채팅방

| Column     | Type        | Nullable | Description          |
| ---------- | ----------- | -------- | -------------------- |
| id         | bigint      | ❌       | PK                   |
| type       | text        | ⭕       | 채팅방 타입 (direct) |
| created_at | timestamptz | ⭕       | 생성 시각            |

#### 12. chat_room_members

- 채팅방 참여자

| Column    | Type        | Nullable | Description |
| --------- | ----------- | -------- | ----------- |
| id        | bigint      | ❌       | PK          |
| room_id   | bigint      | ⭕       | 채팅방 ID   |
| user_id   | uuid        | ⭕       | 참여 유저   |
| joined_at | timestamptz | ⭕       | 참여 시각   |

#### 13. chat_messages

- 채팅 메시지

| Column       | Type        | Nullable | Description |
| ------------ | ----------- | -------- | ----------- |
| id           | bigint      | ❌       | PK          |
| room_id      | bigint      | ⭕       | 채팅방 ID   |
| sender_id    | uuid        | ⭕       | 발신자      |
| content      | text        | ⭕       | 메시지 내용 |
| content_type | text        | ⭕       | 메시지 타입 |
| is_read      | boolean     | ⭕       | 읽음 여부   |
| created_at   | timestamptz | ⭕       | 전송 시각   |

#### 14. chat_message_reads

- 메시지 읽음 기록

| Column     | Type        | Nullable | Description |
| ---------- | ----------- | -------- | ----------- |
| id         | bigint      | ❌       | PK          |
| message_id | bigint      | ❌       | 메시지 ID   |
| user_id    | uuid        | ❌       | 읽은 유저   |
| read_at    | timestamptz | ⭕       | 읽은 시각   |

---

### 3️⃣ Party Domain

#### 15. party_posts

- 파티 모집글

| Column        | Type        | Nullable | Description                                      |
| ------------- | ----------- | -------- | ------------------------------------------------ |
| id            | bigint      | ❌       | PK (자동 증가)                                   |
| creator_id    | uuid        | ❌       | 작성자 ID (로그인 유저만 가능)                   |
| game_title    | text        | ❌       | 게임명                                           |
| party_title   | text        | ❌       | 파티 제목                                        |
| start_date    | date        | ❌       | 시작일                                           |
| start_time    | time        | ❌       | 시작 시간                                        |
| description   | text        | ❌       | 모집 설명                                        |
| max_members   | int4        | ❌       | 파티 최대 인원                                   |
| control_level | text        | ❌       | 컨트롤 수준                                      |
| difficulty    | text        | ❌       | 난이도                                           |
| voice_chat    | text        | ⭕       | 보이스챗 사용 여부(required \| optional \| null) |
| tags          | jsonb       | ⭕       | 태그 배열(string[] 권장)                         |
| created_at    | timestamptz | ❌       | 생성 시각                                        |

#### 16. party_members

- 파티 참여자

| Column    | Type        | Nullable | Description |
| --------- | ----------- | -------- | ----------- |
| id        | bigint      | ❌       | PK          |
| post_id   | bigint      | ⭕       | 파티 ID     |
| user_id   | uuid        | ⭕       | 참여 유저   |
| role      | text        | ⭕       | 역할        |
| joined_at | timestamptz | ⭕       | 참여 시각   |

#### 17. party_messages

- 파티 채팅

| Column       | Type        | Nullable | Description |
| ------------ | ----------- | -------- | ----------- |
| id           | bigint      | ❌       | PK          |
| post_id      | bigint      | ⭕       | 파티 ID     |
| sender_id    | uuid        | ⭕       | 발신자      |
| content      | text        | ⭕       | 메시지      |
| content_type | text        | ⭕       | 메시지 타입 |
| created_at   | timestamptz | ⭕       | 전송 시각   |

#### 18. party_activity_logs

- 파티 활동 로그

| Column     | Type        | Nullable | Description |
| ---------- | ----------- | -------- | ----------- |
| id         | bigint      | ❌       | PK          |
| post_id    | bigint      | ⭕       | 파티 ID     |
| user_id    | uuid        | ⭕       | 유저        |
| action     | text        | ⭕       | 활동 타입   |
| created_at | timestamptz | ⭕       | 발생 시각   |

---

### 4️⃣ Match Domain

#### 19. match_scores

- 매칭 점수

| Column           | Type        | Nullable | Description |
| ---------------- | ----------- | -------- | ----------- |
| id               | bigint      | ❌       | PK          |
| user_id          | uuid        | ⭕       | 기준 유저   |
| target_user_id   | uuid        | ⭕       | 매칭 대상   |
| similarity_score | int         | ⭕       | 매칭 점수   |
| calculated_at    | timestamptz | ⭕       | 계산 시각   |

#### 20. match_filters

- 매칭 필터

| Column          | Type        | Nullable | Description |
| --------------- | ----------- | -------- | ----------- |
| id              | bigint      | ❌       | PK          |
| user_id         | uuid        | ⭕       | 유저        |
| age_range       | text        | ⭕       | 연령대 필터 |
| preferred_genre | text        | ⭕       | 선호 장르   |
| mode            | text        | ⭕       | 플레이 모드 |
| updated_at      | timestamptz | ⭕       | 수정 시각   |

#### 21. match_recent_views

- 최근 조회

| Column         | Type        | Nullable | Description |
| -------------- | ----------- | -------- | ----------- |
| id             | bigint      | ❌       | PK          |
| user_id        | uuid        | ⭕       | 기준 유저   |
| target_user_id | uuid        | ⭕       | 조회 대상   |
| viewed_at      | timestamptz | ⭕       | 조회 시각   |

#### 22. match_results_cache

- 매칭 결과 캐시 (홈 화면 + 매칭 화면 최적화용)

| Column      | Type        | Nullable | Description                                |
| ----------- | ----------- | -------- | ------------------------------------------ |
| viewer_id   | uuid        | ❌       | 기준 유저 (PK 일부)                        |
| target_id   | uuid        | ❌       | 매칭 대상 (PK 일부)                        |
| context     | text        | ❌       | 캐시 컨텍스트 (PK 일부, 'home' \| 'match') |
| score       | int         | ❌       | 매칭 점수                                  |
| reasons     | jsonb       | ❌       | 매칭 이유 배열 (CoreDTO)                   |
| tags        | jsonb       | ❌       | 매칭 태그 배열 (CoreDTO)                   |
| computed_at | timestamptz | ⭕       | 계산 시각 (기본값: NOW())                  |

**Primary Key**: (viewer_id, target_id, context)

**인덱스**:

- `idx_cache_viewer_context_score`: (viewer_id, context, score DESC) - context별 점수순 조회
- `idx_cache_context_time`: (viewer_id, context, computed_at DESC) - 5분 TTL 체크용

**용도**:

- **홈 화면** (context='home'): 매칭 카드 4개 표시용, 무제한 캐시
- **매칭 화면** (context='match'): 매칭 목록 12개 표시용, 5분 TTL
- 첫 방문: 실시간 계산 후 캐시 저장 (~300-500ms)
- 재방문: 캐시 조회 (~50-100ms)
- Step 1: 기본 캐싱 구현 (홈 화면)
- Step 2: context 분리 + 5분 TTL (매칭 화면)

#### 23. match_exposure_log

- 매칭 목록 노출 이력 (중복 방지용)

| Column     | Type        | Nullable | Description      |
| ---------- | ----------- | -------- | ---------------- |
| id         | bigserial   | ❌       | PK               |
| viewer_id  | uuid        | ❌       | 기준 유저        |
| target_id  | uuid        | ❌       | 노출된 매칭 대상 |
| exposed_at | timestamptz | ⭕       | 노출 시각        |
| context    | text        | ⭕       | 노출 컨텍스트    |

**인덱스**:

- `idx_exposure_viewer_time`: (viewer_id, exposed_at DESC) - 최근 노출 조회
- `idx_exposure_viewer_target_time`: (viewer_id, target_id, exposed_at DESC) - 중복 체크

**RLS**:

- 사용자는 자신의 노출 이력만 조회 가능
- 쓰기는 서비스 롤만 가능

**용도**:

- 매칭 목록에 노출된 사용자 기록 (4시간 이내 중복 방지)
- match_recent_views (24시간 조회 이력)와 함께 중복 방지 구현
- 주기적 정리: 7일 이상 된 로그 삭제 (Cron)

---

### 5️⃣ Steam Domain

#### 22. steam_user_games

- 유저 게임 기록

| Column           | Type        | Nullable | Description      |
| ---------------- | ----------- | -------- | ---------------- |
| id               | bigint      | ❌       | PK               |
| user_id          | uuid        | ⭕       | 유저             |
| app_id           | int         | ❌       | Steam App ID     |
| name             | text        | ⭕       | 게임명           |
| playtime_forever | int         | ⭕       | 총 플레이 시간   |
| playtime_recent  | int         | ⭕       | 최근 플레이 시간 |
| last_played      | timestamptz | ⭕       | 마지막 실행 시각 |
| created_at       | timestamptz | ⭕       | 생성 시각        |

#### 23. steam_game_info

- 게임 메타

| Column            | Type        | Nullable | Description         |
| ----------------- | ----------- | -------- | ------------------- |
| app_id            | int         | ❌       | Steam App ID        |
| name              | text        | ⭕       | 게임명              |
| genres            | text[]      | ⭕       | 장르                |
| categories        | jsonb[]     | ⭕       | Steam 카테고리 목록 |
| short_description | text        | ⭕       | 설명                |
| header_image      | text        | ⭕       | 헤더 이미지         |
| created_at        | timestamptz | ⭕       | 생성 시각           |

#### 24. steam_sync_logs

- 유저 단위 Steam 동기화 세션 로그

| Column             | Type        | Nullable | Description    |
| ------------------ | ----------- | -------- | -------------- |
| id                 | bigint      | ❌       | PK             |
| user_id            | uuid        | ⭕       | 유저           |
| status             | text        | ⭕       | 동기화 상태    |
| synced_games_count | int         | ⭕       | 동기화 게임 수 |
| synced_at          | timestamptz | ⭕       | 동기화 시각    |

#### 25. steam_game_sync_logs

- 게임 단위 Steam 메타 동기화 상세 로그

| Column     | Type        | Nullable | Description                |
| ---------- | ----------- | -------- | -------------------------- |
| id         | bigint      | ❌       | PK (자동 증가)             |
| app_id     | numeric     | ⭕       | Steam App ID               |
| user_id    | uuid        | ⭕       | 유저(유저 기반 동기화 시)  |
| status     | text        | ❌       | success / skipped / failed |
| reason     | text        | ⭕       | 실패 또는 스킵 사유        |
| created_at | timestamptz | ⭕       | 처리 시각                  |

#### 26. steam_user_stats

- 유저별 Steam 플레이 통계 및 성향 분석 데이터

| Column                    | Type        | Nullable | Description                                       |
| ------------------------- | ----------- | -------- | ------------------------------------------------- |
| user_id                   | uuid        | ❌       | PK, 유저 ID                                       |
| play_style                | text        | ❌       | 플레이 스타일 (casual, hardcore 등)               |
| avg_weekly_playtime       | numeric     | ❌       | 주당 평균 플레이 시간 (분 단위)                   |
| main_genres               | text[]      | ❌       | 주로 플레이하는 장르 목록                         |
| active_time_slots         | text[]      | ❌       | 주로 활동하는 시간대 (00-06, 06-12, 12-18, 18-24) |
| genre_playtime_2w_minutes | jsonb       | ⭕       | 최근 2주간 장르별 플레이 시간 (분 단위)           |
| total_playtime_2w_minutes | numeric     | ⭕       | 최근 2주간 총 플레이 시간 (분 단위)               |
| updated_at                | timestamptz | ❌       | 마지막 업데이트 시각                              |

---

### 6️⃣ Social / Interaction Domain

#### 27. friend_requests

- 유저 간 친구 요청 상태
- 요청 생성, 수락, 거절 등 관계 형성 이전 단계 기록

| Column      | Type        | Nullable | Description    |
| ----------- | ----------- | -------- | -------------- |
| id          | bigint      | ❌       | PK             |
| sender_id   | uuid        | ⭕       | 요청 보낸 유저 |
| receiver_id | uuid        | ⭕       | 요청 받은 유저 |
| status      | text        | ⭕       | 요청 상태      |
| created_at  | timestamptz | ⭕       | 요청 시각      |

#### 28. friendships

- 친구로 연결된 유저 간의 관계 정보
- 쌍방 관계를 하나의 레코드로 관리

| Column     | Type        | Nullable | Description |
| ---------- | ----------- | -------- | ----------- |
| id         | bigint      | ❌       | PK          |
| user_a     | uuid        | ⭕       | 유저 A      |
| user_b     | uuid        | ⭕       | 유저 B      |
| status     | text        | ⭕       | 관계 상태   |
| created_at | timestamptz | ⭕       | 생성 시각   |

#### 29. review_requests

- 게임 시작 후 후기 작성 요청 기록
- game_start_logs와 연결되어 특정 게임 세션에 대한 후기 요청 관리
- actor_id가 target_id에게 후기 작성을 요청한 상태 추적

| Column            | Type        | Nullable | Description                    |
| ----------------- | ----------- | -------- | ------------------------------ |
| id                | bigint      | ❌       | PK                             |
| actor_id          | uuid        | ❌       | 후기 요청한 유저 (FK)          |
| target_id         | uuid        | ❌       | 후기 작성 대상 유저 (FK)       |
| game_start_log_id | bigint      | ❌       | 게임 시작 로그 ID (FK)         |
| status            | text        | ❌       | 요청 상태                      |
| created_at         | timestamptz | ❌       | 요청 생성 시각                 |
| completed_at      | timestamptz | ⭕       | 후기 작성 완료 시각            |

**Foreign Keys**:
- `actor_id` → `user_profiles.id`
- `target_id` → `user_profiles.id`
- `game_start_log_id` → `game_start_logs.id`

#### 30. reviews

- 파티 또는 플레이 이후 유저가 남긴 평가 기록
- 매너, 협업, 소통 등 점수 및 코멘트 포함
- 유저 온도, 티어 계산의 핵심 입력 데이터

| Column              | Type        | Nullable | Description |
| ------------------- | ----------- | -------- | ----------- |
| id                  | bigint      | ❌       | PK          |
| reviewer_id         | uuid        | ⭕       | 작성자      |
| target_user_id      | uuid        | ⭕       | 대상 유저   |
| score_manner        | int         | ⭕       | 매너 점수   |
| score_teamwork      | int         | ⭕       | 팀워크 점수 |
| score_communication | int         | ⭕       | 소통 점수   |
| comment             | text        | ⭕       | 후기 내용   |
| created_at          | timestamptz | ⭕       | 작성 시각   |

---

### 7️⃣ System / Logs Domain

#### 31. game_start_logs

- 게임 시작 로그 테이블
- 매칭/파티 등에서 실제 게임 시작 시점의 행동을 기록

| Column       | Type        | Nullable | Description                        |
| ------------ | ----------- | -------- | ---------------------------------- |
| id           | bigint      | ❌       | PK                                 |
| actor_id     | uuid        | ❌       | 게임 시작을 요청한 유저            |
| context_type | text        | ❌       | 게임 시작 컨텍스트 (chat, party)   |
| context_id   | text        | ❌       | 컨텍스트 식별자 (매칭 ID, 파티 ID) |
| game_id      | text        | ⭕       | Steam 게임 ID                      |
| game_name    | text        | ⭕       | 게임 이름                          |
| created_at   | timestamptz | ❌       | 게임 시작 기록 시각                |

#### 32. analytics_user_actions

- 행동 로그

| Column     | Type        | Nullable | Description        |
| ---------- | ----------- | -------- | ------------------ |
| id         | bigint      | ❌       | PK                 |
| user_id    | uuid        | ⭕       | 행동을 수행한 유저 |
| action     | text        | ⭕       | 행동 타입          |
| target_id  | text        | ⭕       | 행동 대상 식별자   |
| created_at | timestamptz | ⭕       | 행동 발생 시각     |

#### 33. event_logs

- 서비스 이벤트 기록 테이블
- 유저 행동 또는 시스템 이벤트를 구조적으로 기록

| Column     | Type        | Nullable | Description   |
| ---------- | ----------- | -------- | ------------- |
| id         | bigint      | ❌       | PK            |
| user_id    | uuid        | ⭕       | 관련 유저     |
| event_type | text        | ⭕       | 이벤트 타입   |
| metadata   | jsonb       | ⭕       | 이벤트 데이터 |
| created_at | timestamptz | ⭕       | 발생 시각     |

#### 34. error_logs

- 시스템 에러 기록 테이블
- 서버/클라이언트/배치 작업 등에서 발생한 오류를 기록

| Column     | Type        | Nullable | Description    |
| ---------- | ----------- | -------- | -------------- |
| id         | bigint      | ❌       | PK             |
| source     | text        | ⭕       | 에러 발생 위치 |
| message    | text        | ⭕       | 에러 메시지    |
| stacktrace | text        | ⭕       | 스택 트레이스  |
| created_at | timestamptz | ⭕       | 발생 시각      |

#### 35. bans

- 유저 제재 정보 테이블
- 일시적 또는 영구 제재 상태 관리

| Column     | Type        | Nullable | Description    |
| ---------- | ----------- | -------- | -------------- |
| id         | bigint      | ❌       | PK             |
| user_id    | uuid        | ⭕       | 제재 대상 유저 |
| reason     | text        | ⭕       | 제재 사유      |
| expires_at | timestamptz | ⭕       | 제재 만료 시각 |
| created_at | timestamptz | ⭕       | 제재 생성 시각 |

#### 36. temperature_logs

- 유저 온도 점수 변경 로그
- 후기, 신고, 시스템 판단에 따른 점수 변화 기록

| Column     | Type        | Nullable | Description |
| ---------- | ----------- | -------- | ----------- |
| id         | bigint      | ❌       | PK          |
| user_id    | uuid        | ⭕       | 유저        |
| change     | numeric     | ⭕       | 점수 변화   |
| reason     | text        | ⭕       | 변경 사유   |
| created_at | timestamptz | ⭕       | 발생 시각   |

#### 37. tier_history

- 유저 티어 변경 이력 테이블
- 티어 상승/하락 이력 보존

| Column        | Type        | Nullable | Description  |
| ------------- | ----------- | -------- | ------------ |
| id            | bigint      | ❌       | PK           |
| user_id       | uuid        | ⭕       | 유저         |
| previous_tier | text        | ⭕       | 이전 티어    |
| current_tier  | text        | ⭕       | 변경 후 티어 |
| changed_at    | timestamptz | ⭕       | 변경 시각    |

#### 38. notifications

- 유저에게 전달되는 시스템 알림 테이블

| Column      | Type        | Nullable | Description         |
| ----------- | ----------- | -------- | ------------------- |
| id          | bigint      | ❌       | PK                  |
| user_id     | uuid        | ⭕       | 알림 수신 유저      |
| type        | text        | ⭕       | 알림 타입           |
| title       | text        | ⭕       | 알림 제목           |
| message     | text        | ⭕       | 알림 본문           |
| is_read     | boolean     | ⭕       | 읽음 여부           |
| actor_id    | uuid        | ⭕       | 알림 발생 주체 유저 |
| entity_id   | text        | ⭕       | 관련 엔티티 ID      |
| entity_type | text        | ⭕       | 관련 엔티티 타입    |
| created_at  | timestamptz | ⭕       | 생성 시각           |

#### 39. push_tokens

- 푸시 알림 전송을 위한 디바이스 토큰 관리 테이블

| Column     | Type        | Nullable | Description |
| ---------- | ----------- | -------- | ----------- |
| id         | bigint      | ❌       | PK          |
| user_id    | uuid        | ⭕       | 유저        |
| token      | text        | ⭕       | 푸시 토큰   |
| platform   | text        | ⭕       | 플랫폼      |
| created_at | timestamptz | ⭕       | 생성 시각   |

---

📌 본 문서는 ReadyGo 데이터베이스 구조에 대한 최종 사실 문서이며,
기획·API·타입 정의·ERD의 기준으로 사용된다.

---

## Document Metadata

- **Author**: ReadyGo / Eunkyoung Kim(김은경)
- **Created At**: 2025-12-24
- **Last Updated At**: 2026-01-15
- **Document Version**: v1.0.17
- **Status**: Active
- **Source of Truth**:
  - Supabase Production Database
  - database.types.ts

## Version History

| Version | Date       | Description                                                                                                                                                                                                     |
| ------: | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  v1.0.0 | 2025-12-24 | Detailed table & column documentation (33 tables)                                                                                                                                                               |
|  v1.0.1 | 2025-12-26 | steam_game_info 테이블 컬럼 추가 및 수정                                                                                                                                                                        |
|  v1.0.2 | 2025-12-26 | steam_game_info categories, genres 컬럼 수정(jsonb[], text[])                                                                                                                                                   |
|  v1.0.3 | 2025-12-26 | 게임 단위 Steam 메타 동기화 상세 로그 확인을 위한 steam_game_sync_logs 테이블 추가                                                                                                                              |
|  v1.0.4 | 2025-12-27 | party_posts 컬럼 NOT NULL 정리 및 RLS 정책 적용(생성자만 수정 가능, 인증 유저 조회 허용)                                                                                                                        |
|  v1.0.5 | 2025-12-27 | title => game_title 컬럼 명 변경                                                                                                                                                                                |
|  v1.0.6 | 2025-12-29 | User/Profile Domain에 user_status 테이블 추가                                                                                                                                                                   |
|  v1.0.7 | 2025-12-29 | user_play_schedules 테이블 추가, 테이블 번호 순서 정리 (5번 중복 해결, 6~36번으로 재정렬)                                                                                                                       |
|  v1.0.8 | 2025-01-13 | chat_blocks 테이블명을 user_blocks로 변경, User/Profile Domain으로 이동                                                                                                                                         |
|  v1.0.9 | 2025-01-15 | chat_message_reads 테이블: message_id, user_id를 NOT NULL로 변경, (message_id, user_id) UNIQUE 제약조건 추가                                                                                                    |
| v1.0.10 | 2025-01-07 | Steam Domain에 steam_user_stats 테이블 추가, 테이블 번호 재정렬 (27~37번)                                                                                                                                       |
| v1.0.11 | 2025-01-15 | user_profiles.temperature_score, temperature_logs.change 컬럼 타입을 int → numeric으로 변경                                                                                                                     |
| v1.0.12 | 2026-01-09 | Match Domain에 match_results_cache 테이블 추가 (Step 1 캐싱 시스템)                                                                                                                                             |
| v1.0.13 | 2026-01-09 | match_results_cache에 context 컬럼 추가, match_exposure_log 테이블 추가 (Step 2 중복 방지 + 5분 TTL)                                                                                                            |
| v1.0.14 | 2026-01-11 | notifications 테이블에 actor_id, entity_id, entity_type 컬럼 추가                                                                                                                                               |
| v1.0.15 | 2026-01-12 | System/Logs Domain에 game_start_logs 테이블 추가 (게임 시작 로그), 테이블 번호 재정렬 (32~38번)                                                                                                                 |
| v1.0.16 | 2026-01-15 | steam_user_stats 테이블 컬럼 추가 (genre_playtime_2w_minutes, total_playtime_2w_minutes) 및 타입 수정, match_exposure_log nullable 수정, game_start_logs 중복 제거 및 타입 수정, steam_game_sync_logs 타입 수정 |
| v1.0.17 | 2026-01-15 | review_requests 테이블 추가 (게임 시작 후 후기 작성 요청 관리)                                                                                                                              |

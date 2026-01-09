# Domain ERD

본 문서는 ReadyGo 서비스의 도메인별 데이터베이스 구조를 ERD로 시각화한 문서이다.

## 기준 (Source of Truth)

- Supabase 실제 DB
- `database.types.ts`
- `01-schema-analysis.md`

📌 본 문서는 구조 시각화 목적이며, 컬럼 상세 정의·nullable 여부·제약 조건은 `01-schema-analysis.md`를 기준으로 한다.

---

### 1️⃣ User / Profile Domain

- 유저의 기본 프로필, 설정, 성향, 태그, 신고, 차단 정보를 관리
- auth.users는 논리적 기준이며 ERD에는 포함하지 않음

```mermaid
erDiagram
  user_profiles ||--|| user_settings : has
  user_profiles ||--|| user_status : has
  user_profiles ||--o{ user_social_links : has
  user_profiles ||--|| user_traits : has
  user_profiles ||--o{ user_tags : has
  tags ||--o{ user_tags : mapped_by
  user_profiles ||--o{ user_reports : reported
  user_profiles ||--o{ user_play_schedules : plays_at
  user_profiles ||--o{ user_blocks : blocks
```

---

### 2️⃣ Chat Domain

- 1:1 및 그룹 채팅 구조
- 채팅방, 참여자, 메시지, 읽음 상태 포함

```mermaid
erDiagram
  chat_rooms ||--o{ chat_room_members : contains
  chat_rooms ||--o{ chat_messages : has
  chat_messages ||--o{ chat_message_reads : read_by
  user_profiles ||--o{ chat_room_members : joins
  user_profiles ||--o{ chat_messages : sends
```

---

### 3️⃣ Party Domain

- 파티 모집, 참여, 파티 채팅 및 활동 로그 관리
- 파티 단위의 독립된 커뮤니케이션 구조

```mermaid
erDiagram
  party_posts ||--o{ party_members : has
  party_posts ||--o{ party_messages : has
  party_posts ||--o{ party_activity_logs : logs
  user_profiles ||--o{ party_posts : creates
  user_profiles ||--o{ party_members : joins
  user_profiles ||--o{ party_messages : sends
```

---

### 4️⃣ Match Domain

- 유저 성향 기반 매칭 결과 및 필터
- 매칭 점수와 최근 조회 이력 관리
- 홈 화면 최적화를 위한 캐시 시스템

```mermaid
erDiagram
  user_profiles ||--o{ match_scores : calculates
  user_profiles ||--o{ match_recent_views : views
  user_profiles ||--o{ match_results_cache : "cached_as_viewer"
  user_profiles ||--o{ match_results_cache : "cached_as_target"
  user_profiles ||--|| match_filters : configures
```

---

### 5️⃣ Steam Integration Domain

- Steam 계정 연동 후 수집된 게임 데이터 관리
- 게임 메타데이터와 유저별 플레이 기록 분리

```mermaid
erDiagram
  user_profiles ||--o{ steam_user_games : owns
  steam_game_info ||--o{ steam_user_games : referenced_by

  user_profiles ||--o{ steam_sync_logs : syncs
  steam_sync_logs ||--o{ steam_game_sync_logs : contains

  steam_game_info ||--o{ steam_game_sync_logs : logged_for
```

---

### 6️⃣ Social / Interaction Domain

- 친구 관계, 친구 요청, 후기, 알림 등
- 유저 간 상호작용 기록 관리

```mermaid
erDiagram
  user_profiles ||--o{ friend_requests : sends
  user_profiles ||--o{ friendships : connects
  user_profiles ||--o{ reviews : writes
  user_profiles ||--o{ notifications : receives
```

---

### 7️⃣ System / Logs Domain

- 서비스 운영을 위한 로그 및 상태 기록
- 분석 / 추적 / 관리 목적 데이터

```mermaid
erDiagram
  user_profiles ||--o{ analytics_user_actions : logs
  user_profiles ||--o{ event_logs : triggers
  user_profiles ||--o{ error_logs : causes
  user_profiles ||--o{ bans : restricted_by
  user_profiles ||--o{ temperature_logs : affects
  user_profiles ||--o{ tier_history : changes
```

---

본 문서는 도메인 단위의 구조적 관계 이해를 위한 ERD 문서이다.

- 컬럼 정의, Nullable, FK, UNIQUE 여부 → 01-schema-analysis.md
- 실제 타입 기준 → database.types.ts

📌 ERD는 분석 문서를 기반으로만 수정한다.

---

## Document Metadata

- **Author**: ReadyGo / Eunkyoung Kim(김은경)
- **Created At**: 2025-12-24
- **Last Updated At**: 2026-01-09
- **Document Version**: v1.0.5
- **Status**: Active
- **Source of Truth**:
  - Supabase Production Database
  - database.types.ts

## Version History

| Version | Date       | Description                                                    |
| ------: | ---------- | -------------------------------------------------------------- |
|  v1.0.0 | 2025-12-24 | Domain-level ERD diagrams                                      |
|  v1.0.1 | 2025-12-26 | Steam 도메인 ERD 수정                                          |
|  v1.0.2 | 2025-12-29 | User/Profile Domain에 user_status 추가                         |
|  v1.0.3 | 2025-12-29 | user_play_schedules 테이블 추가에 따른 ERD 수정                |
|  v1.0.4 | 2025-01-13 | chat_blocks를 user_blocks로 변경, User/Profile Domain으로 이동 |
|  v1.0.5 | 2026-01-09 | Match Domain에 match_results_cache 추가 (캐싱 시스템)          |

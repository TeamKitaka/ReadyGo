## Source of Truth (SSOT)

본 문서의 단일 기준은 다음과 같다.

1. Supabase 실제 데이터베이스
2. Supabase CLI로 생성된 database.types.ts

📌 중요 규칙

database.types.ts와 본 문서는 항상 동일 커밋에 포함되어야 한다.

---

# Supabase Schema Analysis

Schema: public  
Total Tables: 38  
Generated from: database.types.ts

## Scope - 분석 범위

포함:

- public schema 테이블
- 컬럼 정의 (name / type / nullable)
- 물리적 Foreign Key
- UNIQUE 제약

제외:

- auth schema (auth.users 포함)
- RLS 정책
- Trigger / Function
- CHECK 제약

## Tables Overview - 테이블 목록 요약

```
- analytics_user_actions
- bans
- user_blocks
- chat_message_reads
- chat_messages
- chat_room_members
- chat_rooms
- error_logs
- event_logs
- game_start_logs
- friend_requests
- friendships
- match_filters
- match_recent_views
- match_results_cache
- match_exposure_log
- match_scores
- notifications
- party_activity_logs
- party_members
- party_messages
- party_posts
- push_tokens
- reviews
- steam_game_info
- steam_game_sync_logs
- steam_sync_logs
- steam_user_games
- steam_user_stats
- tags
- temperature_logs
- tier_history
- user_profiles
- user_reports
- user_settings
- user_status
- user_social_links
- user_tags
- user_traits
- user_play_schedules
```

📌 총 38개 (public schema 기준)

## Column Definition Rules

- 컬럼 정보는 database.types.ts의 Row 타입 기준
- Nullable 여부는 `| null` 존재 여부로 판단
- 기본값(default)은 타입 파일에 명시된 경우만 기록

## Foreign Key Policy

- Tables.\*.Relationships에 명시된 관계만
  물리적 FK로 간주
- auth.users와의 관계는 논리적 연결로만 취급

📌 현재 물리 FK 존재 테이블

```
- chat_message_reads → chat_messages
- chat_messages → chat_rooms
- chat_room_members → chat_rooms
- party_activity_logs → party_posts
- party_members → party_posts
- party_messages → party_posts
- user_tags → tags
```

## Constraints & UNIQUE

- N:N 관계 테이블에 복합 UNIQUE 정상 존재
- 단일 컬럼 UNIQUE 오염 없음
- 중복 UNIQUE 제약 없음

📌 확인된 복합 UNIQUE 예시:

```
- chat_room_members (room_id, user_id)
- party_members (post_id, user_id)
- user_tags (user_id, tag_id)
- user_blocks (user_id, blocked_user_id)
- friendships (user_a, user_b)
```

## Indexes

- 본 단계에서는 인덱스 존재 여부만 확인
- 일부 컬럼(steam_game_info.genres, categories)에 대해 GIN 인덱스가 추가되어 있음
- 성능 최적화 목적의 인덱스 설계는 다음 단계에서 진행

---

본 문서는 현재 Supabase DB 상태를 사실 그대로 반영한 분석 문서이며, ReadyGo 데이터 구조의 기준 문서로 사용된다.
이 문서와 `database.types.ts`가 데이터베이스 구조에 대한 단일 기준이다.

---

## Document Metadata

- **Author**: ReadyGo / Eunkyoung Kim(김은경)
- **Created At**: 2025-12-24
- **Last Updated At**: 2026-01-12
- **Document Version**: v1.0.6
- **Status**: Active
- **Source of Truth**:
  - Supabase Production Database
  - database.types.ts

## Version History

| Version | Date       | Description                                       |
| ------: | ---------- | ------------------------------------------------- |
|  v1.0.0 | 2025-12-24 | Public schema analysis based on database.types.ts |
|  v1.0.1 | 2025-12-26 | 테이블 추가에 따른 테이블 목록 요약 수정          |
|  v1.0.2 | 2025-12-29 | user_status 테이블 추가                           |
|  v1.0.3 | 2025-12-29 | user_play_schedules 테이블 추가                   |
|  v1.0.4 | 2025-01-13 | chat_blocks 테이블명을 user_blocks로 변경         |
|  v1.0.5 | 2025-01-07 | steam_user_stats 테이블 추가                      |
|  v1.0.6 | 2026-01-09 | match_results_cache 테이블 추가 (Step 1 캐싱)     |
|  v1.0.7 | 2026-01-09 | match_exposure_log 테이블 추가 (Step 2 중복 방지) |

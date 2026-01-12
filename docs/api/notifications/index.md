# API 명세서

---

## 문서 정보

| 항목        | 내용             |
| ----------- | ---------------- |
| 작성자      | ReadyGo Team     |
| 최초 작성일 | 2026-01-12       |
| 최종 수정일 | 2026-01-12       |
| 관련 화면   | Notifications    |
| 관련 이슈   | 알림 시스템 구현 |

---

## 기능

- 현재 사용자의 알림 목록을 조회합니다.
- 최신순으로 정렬되어 반환됩니다.
- 각 알림의 발신자(actor) 프로필 정보를 포함합니다.

## 카테고리

- Notifications

## 설명

- 알림 수신함 화면에서 사용됩니다.
- `notifications` 테이블에서 `user_id`가 현재 사용자인 알림을 조회합니다.
- 각 알림의 `actor_id`에 해당하는 `user_profiles` 정보를 함께 반환합니다.
- 기본적으로 최대 50개까지 조회합니다.

---

## Method

- GET

## URL

- `/api/notifications`

---

## Param

### Path Parameter

없음

### Query Parameter

없음

---

## 사용자

- 로그인 필요: **필수**
- 접근 가능한 사용자: 인증된 모든 사용자 (자신의 알림만 조회)

---

## Request

### Header

| key    | 설명               | value 타입 | 필수 | 비고   |
| ------ | ------------------ | ---------- | ---- | ------ |
| Cookie | Supabase 세션 쿠키 | string     | 필수 | 인증용 |

### Body

없음

---

## Response

### Body

| key                  | 설명                     | value 타입 | 옵션 | Nullable | 예시                         |
| -------------------- | ------------------------ | ---------- | ---- | -------- | ---------------------------- |
| data                 | 알림 목록 배열           | array      | 필수 | ❌       | 아래 예시 참조               |
| data[].id            | 알림 ID                  | number     | 필수 | ❌       | 1                            |
| data[].user_id       | 알림 받은 사용자 ID      | string     | 필수 | ⭕       | "123e4567-e89b-12d3-a456..." |
| data[].type          | 알림 타입                | string     | 필수 | ⭕       | "FRIEND_REQUESTED"           |
| data[].title         | 알림 제목                | string     | 필수 | ⭕       | "친구 요청"                  |
| data[].message       | 알림 본문                | string     | 필수 | ⭕       | "친구 요청이 도착했습니다."  |
| data[].is_read       | 읽음 여부                | boolean    | 필수 | ⭕       | false                        |
| data[].actor_id      | 알림 발생 주체 사용자 ID | string     | 필수 | ⭕       | "987e6543-e21b-12d3-a456..." |
| data[].entity_type   | 관련 엔티티 타입         | string     | 필수 | ⭕       | "friend_request"             |
| data[].entity_id     | 관련 엔티티 ID           | string     | 필수 | ⭕       | "1"                          |
| data[].created_at    | 알림 생성 시각           | string     | 필수 | ⭕       | "2026-01-12T10:00:00Z"       |
| data[].actor_profile | 알림 발생 주체 프로필    | object     | 필수 | ⭕       | user_profiles 테이블 구조    |

### Example

```json
{
  "data": [
    {
      "id": 1,
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "FRIEND_REQUESTED",
      "title": "친구 요청",
      "message": "친구 요청이 도착했습니다.",
      "is_read": false,
      "actor_id": "987e6543-e21b-12d3-a456-426614174111",
      "entity_type": "friend_request",
      "entity_id": "1",
      "created_at": "2026-01-12T10:00:00Z",
      "actor_profile": {
        "id": "987e6543-e21b-12d3-a456-426614174111",
        "nickname": "친구요청자",
        "avatar_url": "https://example.com/avatar.jpg"
      }
    },
    {
      "id": 2,
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "FRIEND_ACCEPTED",
      "title": "친구 수락",
      "message": "친구 요청이 수락되었습니다.",
      "is_read": true,
      "actor_id": "987e6543-e21b-12d3-a456-426614174111",
      "entity_type": "friend_request",
      "entity_id": "1",
      "created_at": "2026-01-12T09:00:00Z",
      "actor_profile": {
        "id": "987e6543-e21b-12d3-a456-426614174111",
        "nickname": "친구",
        "avatar_url": null
      }
    }
  ]
}
```

---

## Status

| status | response content | 설명      |
| ------ | ---------------- | --------- |
| 200    | OK               | 조회 성공 |
| 401    | AUTH_REQUIRED    | 인증 필요 |
| 500    | INTERNAL_ERROR   | 서버 오류 |

---

## 기타

- 프론트엔드 처리 시 주의사항:
  - 알림이 없는 경우 빈 배열(`[]`)을 반환합니다.
  - `actor_profile`이 `null`일 수 있으므로 null 체크가 필요합니다.
  - Realtime 구독을 통해 실시간으로 업데이트됩니다 (`useNotifications` hook).
  - 알림 타입(`type`)에 따라 다른 UI를 표시해야 합니다:
    - `FRIEND_REQUESTED`: 친구 요청 알림
    - `FRIEND_ACCEPTED`: 친구 수락 알림
    - `CHAT_RECEIVED`: 채팅 메시지 알림
    - `REVIEW_REQUESTED`: 후기 요청 알림
    - `REVIEW_RECEIVED`: 후기 받음 알림
    - `GAME_STARTED`: 게임 시작 알림

- Empty / Loading / Error UX:
  - Empty: "알림이 없습니다" 메시지 표시
  - Loading: 스켈레톤 UI 또는 로딩 스피너 표시
  - Error: 에러 메시지 표시 및 재시도 버튼 제공

---

## Change Log

| 날짜       | 변경 내용 | 작성자 |
| ---------- | --------- | ------ |
| 2026-01-12 | 최초 작성 | System |

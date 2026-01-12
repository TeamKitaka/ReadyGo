# API 명세서

---

## 문서 정보

| 항목        | 내용             |
| ----------- | ---------------- |
| 작성자      | 김은경           |
| 최초 작성일 | 2026-01-12       |
| 최종 수정일 | 2026-01-12       |
| 관련 화면   | FriendLists      |
| 관련 이슈   | 친구 시스템 구현 |

---

## 기능

- 현재 사용자의 친구 목록을 조회합니다.
- `friendships` 테이블을 기준으로 친구 목록을 반환합니다.
- 각 친구의 프로필 정보와 온라인 상태를 포함합니다.

## 카테고리

- Friends

## 설명

- 친구 목록 화면에서 사용됩니다.
- `friendships` 테이블에서 현재 사용자와 친구 관계인 모든 사용자 ID를 조회합니다.
- 친구들의 `user_profiles`와 `user_status` 정보를 함께 반환합니다.

---

## Method

- GET

## URL

- `/api/friends/list`

---

## Param

### Path Parameter

없음

### Query Parameter

없음

---

## 사용자

- 로그인 필요: **필수**
- 접근 가능한 사용자: 인증된 모든 사용자 (자신의 친구 목록만 조회)

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

| key            | 설명                    | value 타입 | 옵션 | Nullable | 예시                         |
| -------------- | ----------------------- | ---------- | ---- | -------- | ---------------------------- |
| data           | 친구 목록 배열          | array      | 필수 | ❌       | 아래 예시 참조               |
| data[].user_id | 친구의 사용자 ID        | string     | 필수 | ❌       | "123e4567-e89b-12d3-a456..." |
| data[].profile | 친구의 프로필 정보      | object     | 필수 | ⭕       | user_profiles 테이블 구조    |
| data[].status  | 친구의 온라인 상태 정보 | object     | 필수 | ⭕       | user_status 테이블 구조      |

### Example

```json
{
  "data": [
    {
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "profile": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "nickname": "친구1",
        "avatar_url": "https://example.com/avatar1.jpg",
        "tier": "gold",
        "animal_type": "fox"
      },
      "status": {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "status": "online",
        "last_seen": "2026-01-12T10:00:00Z"
      }
    },
    {
      "user_id": "987e6543-e21b-12d3-a456-426614174111",
      "profile": {
        "id": "987e6543-e21b-12d3-a456-426614174111",
        "nickname": "친구2",
        "avatar_url": null,
        "tier": "silver",
        "animal_type": "cat"
      },
      "status": null
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
  - 친구가 없는 경우 빈 배열(`[]`)을 반환합니다.
  - `profile`이나 `status`가 `null`일 수 있으므로 null 체크가 필요합니다.
  - Realtime 구독은 없지만, 필요시 주기적으로 refetch할 수 있습니다.

- Empty / Loading / Error UX:
  - Empty: "친구가 없습니다" 메시지 표시
  - Loading: 스켈레톤 UI 또는 로딩 스피너 표시
  - Error: 에러 메시지 표시 및 재시도 버튼 제공

---

## Change Log

| 날짜       | 변경 내용 | 작성자 |
| ---------- | --------- | ------ |
| 2026-01-12 | 최초 작성 | System |

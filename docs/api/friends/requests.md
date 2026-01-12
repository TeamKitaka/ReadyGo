# API 명세서

---

## 문서 정보

| 항목        | 내용                    |
| ----------- | ----------------------- |
| 작성자      | ReadyGo Team            |
| 최초 작성일 | 2026-01-12              |
| 최종 수정일 | 2026-01-12              |
| 관련 화면   | FriendRequests          |
| 관련 이슈   | 친구 시스템 구현        |

---

## 기능

- 현재 사용자가 받은 pending 상태의 친구 요청 목록을 조회합니다.
- 각 요청의 발신자(sender) 프로필 정보를 포함합니다.

## 카테고리

- Friends

## 설명

- 친구 요청 목록 화면에서 사용됩니다.
- `friend_requests` 테이블에서 `receiver_id`가 현재 사용자이고 `status`가 `pending`인 요청만 조회합니다.
- 각 요청의 `sender_id`에 해당하는 `user_profiles` 정보를 함께 반환합니다.

---

## Method

- GET

## URL

- `/api/friends/requests`

---

## Param

### Path Parameter

없음

### Query Parameter

없음

---

## 사용자

- 로그인 필요: **필수**
- 접근 가능한 사용자: 인증된 모든 사용자 (자신이 받은 요청만 조회)

---

## Request

### Header

| key | 설명 | value 타입 | 필수 | 비고 |
| --- | ---- | ---------- | ---- | ---- |
| Cookie | Supabase 세션 쿠키 | string     | 필수 | 인증용 |

### Body

없음

---

## Response

### Body

| key                      | 설명                    | value 타입 | 옵션 | Nullable | 예시                        |
| ------------------------ | ----------------------- | ---------- | ---- | -------- | --------------------------- |
| data                     | 친구 요청 목록 배열      | array      | 필수 | ❌       | 아래 예시 참조               |
| data[].id                | 친구 요청 ID             | number     | 필수 | ❌       | 1                           |
| data[].sender_id         | 요청 보낸 사용자 ID      | string     | 필수 | ⭕       | "123e4567-e89b-12d3-a456..." |
| data[].receiver_id       | 요청 받은 사용자 ID      | string     | 필수 | ⭕       | "987e6543-e21b-12d3-a456..." |
| data[].status            | 요청 상태                | string     | 필수 | ⭕       | "pending"                   |
| data[].created_at        | 요청 생성 시각           | string     | 필수 | ⭕       | "2026-01-12T10:00:00Z"      |
| data[].sender_profile    | 요청 보낸 사용자 프로필  | object     | 필수 | ⭕       | user_profiles 테이블 구조    |

### Example

```json
{
  "data": [
    {
      "id": 1,
      "sender_id": "123e4567-e89b-12d3-a456-426614174000",
      "receiver_id": "987e6543-e21b-12d3-a456-426614174111",
      "status": "pending",
      "created_at": "2026-01-12T10:00:00Z",
      "sender_profile": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "nickname": "친구요청자",
        "avatar_url": "https://example.com/avatar.jpg",
        "tier": "gold",
        "animal_type": "fox"
      }
    }
  ]
}
```

---

## Status

| status | response content | 설명        |
| ------ | ---------------- | ----------- |
| 200    | OK               | 조회 성공    |
| 401    | AUTH_REQUIRED    | 인증 필요    |
| 500    | INTERNAL_ERROR   | 서버 오류    |

---

## 기타

- 프론트엔드 처리 시 주의사항:
  - 친구 요청이 없는 경우 빈 배열(`[]`)을 반환합니다.
  - `sender_profile`이 `null`일 수 있으므로 null 체크가 필요합니다.
  - Realtime 구독을 통해 실시간으로 업데이트됩니다 (`useFriendRequests` hook).

- Empty / Loading / Error UX:
  - Empty: "받은 친구 요청이 없습니다" 메시지 표시
  - Loading: 스켈레톤 UI 또는 로딩 스피너 표시
  - Error: 에러 메시지 표시 및 재시도 버튼 제공

---

## Change Log

| 날짜       | 변경 내용 | 작성자 |
| ---------- | --------- | ------ |
| 2026-01-12 | 최초 작성  | System |


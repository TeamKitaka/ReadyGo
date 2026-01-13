# API 명세서

---

## 문서 정보

| 항목        | 내용                    |
| ----------- | ----------------------- |
| 작성자      | 김은경                  |
| 최초 작성일 | 2026-01-12              |
| 최종 수정일 | 2026-01-12              |
| 관련 화면   | ProfilePanel, SidePanel |
| 관련 이슈   | 친구 시스템 구현        |

---

## 기능

- 특정 사용자에게 친구 요청을 전송합니다.
- 친구 요청이 생성되면 `friend_requests` 테이블에 `pending` 상태로 저장됩니다.
- 친구 요청 알림이 자동으로 생성됩니다.

## 카테고리

- Friends

## 설명

- 사용자가 다른 사용자의 프로필에서 "친구 추가" 버튼을 클릭할 때 호출됩니다.
- 본인에게 친구 요청을 보낼 수 없습니다.
- 이미 친구인 경우 또는 이미 pending 요청이 있는 경우 에러를 반환합니다.

---

## Method

- POST

## URL

- `/api/friends/request`

---

## Param

### Path Parameter

없음

### Query Parameter

없음

---

## 사용자

- 로그인 필요: **필수**
- 접근 가능한 사용자: 인증된 모든 사용자

---

## Request

### Header

| key    | 설명               | value 타입 | 필수 | 비고   |
| ------ | ------------------ | ---------- | ---- | ------ |
| Cookie | Supabase 세션 쿠키 | string     | 필수 | 인증용 |

### Body

| key         | 설명           | value 타입 | 옵션 | Nullable | 예시                         |
| ----------- | -------------- | ---------- | ---- | -------- | ---------------------------- |
| receiver_id | 요청 받을 유저 | string     | 필수 | ❌       | "123e4567-e89b-12d3-a456..." |

---

## Response

### Body

| key     | 설명                  | value 타입 | 옵션 | Nullable | 예시                          |
| ------- | --------------------- | ---------- | ---- | -------- | ----------------------------- |
| success | 성공 여부             | boolean    | 필수 | ❌       | true                          |
| message | 응답 메시지           | string     | 필수 | ❌       | "친구 요청이 전송되었습니다." |
| data    | 생성된 친구 요청 정보 | object     | 필수 | ❌       | 아래 예시 참조                |
| data.id | 친구 요청 ID          | number     | 필수 | ❌       | 1                             |

### Example

```json
{
  "success": true,
  "message": "친구 요청이 전송되었습니다.",
  "data": {
    "id": 1,
    "sender_id": "123e4567-e89b-12d3-a456-426614174000",
    "receiver_id": "987e6543-e21b-12d3-a456-426614174111",
    "status": "pending",
    "created_at": "2026-01-12T10:00:00Z"
  }
}
```

---

## Status

| status | response content                      | 설명                            |
| ------ | ------------------------------------- | ------------------------------- |
| 200    | OK                                    | 친구 요청 전송 성공             |
| 400    | VALIDATION_ERROR                      | 요청 값 오류 (receiver_id 누락) |
| 400    | Already friends                       | 이미 친구로 등록된 사용자       |
| 400    | already sent / already received       | 이미 친구 요청이 전송됨         |
| 400    | 본인에게 친구 요청을 보낼 수 없습니다 | sender_id === receiver_id       |
| 401    | AUTH_REQUIRED                         | 인증 필요                       |
| 500    | INTERNAL_ERROR                        | 서버 오류                       |

---

## 기타

- 프론트엔드 처리 시 주의사항:
  - 친구 요청 전송 후 `useFriendStatus` hook을 refetch하여 UI 상태를 업데이트해야 합니다.
  - Optimistic update 가능: 요청 전송 후 즉시 UI에 반영 가능하지만, 실패 시 롤백 필요합니다.
  - 에러 메시지를 사용자에게 명확히 표시해야 합니다.

- Empty / Loading / Error UX:
  - Loading: 친구 요청 전송 중 버튼 비활성화 및 로딩 표시
  - Error: 에러 메시지 모달 표시
  - Success: "친구 요청을 보냈습니다" 모달 표시

---

## Change Log

| 날짜       | 변경 내용 | 작성자 |
| ---------- | --------- | ------ |
| 2026-01-12 | 최초 작성 | System |

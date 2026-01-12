# API 명세서

---

## 문서 정보

| 항목        | 내용             |
| ----------- | ---------------- |
| 작성자      | 김은경           |
| 최초 작성일 | 2026-01-12       |
| 최종 수정일 | 2026-01-12       |
| 관련 화면   | FriendRequests   |
| 관련 이슈   | 친구 시스템 구현 |

---

## 기능

- 받은 친구 요청을 거절합니다.
- 친구 요청 상태가 `pending`에서 `rejected`로 변경됩니다.
- `friendships` 테이블에는 변경이 없습니다.

## 카테고리

- Friends

## 설명

- 사용자가 받은 친구 요청 목록에서 "거절" 버튼을 클릭할 때 호출됩니다.
- 요청의 `receiver_id`가 현재 사용자와 일치해야 합니다.
- 이미 처리된 요청(pending이 아닌 경우)은 거절할 수 없습니다.

---

## Method

- POST

## URL

- `/api/friends/reject`

---

## Param

### Path Parameter

없음

### Query Parameter

없음

---

## 사용자

- 로그인 필요: **필수**
- 접근 가능한 사용자: 요청의 receiver만 거절 가능

---

## Request

### Header

| key    | 설명               | value 타입 | 필수 | 비고   |
| ------ | ------------------ | ---------- | ---- | ------ |
| Cookie | Supabase 세션 쿠키 | string     | 필수 | 인증용 |

### Body

| key        | 설명         | value 타입 | 옵션 | Nullable | 예시 |
| ---------- | ------------ | ---------- | ---- | -------- | ---- |
| request_id | 친구 요청 ID | number     | 필수 | ❌       | 1    |

---

## Response

### Body

| key     | 설명        | value 타입 | 옵션 | Nullable | 예시                          |
| ------- | ----------- | ---------- | ---- | -------- | ----------------------------- |
| success | 성공 여부   | boolean    | 필수 | ❌       | true                          |
| message | 응답 메시지 | string     | 필수 | ❌       | "친구 요청이 거절되었습니다." |

### Example

```json
{
  "success": true,
  "message": "친구 요청이 거절되었습니다."
}
```

---

## Status

| status | response content       | 설명                             |
| ------ | ---------------------- | -------------------------------- |
| 200    | OK                     | 친구 요청 거절 성공              |
| 400    | VALIDATION_ERROR       | 요청 값 오류 (request_id 누락)   |
| 400    | already been processed | 이미 처리된 친구 요청            |
| 401    | AUTH_REQUIRED          | 인증 필요                        |
| 403    | FORBIDDEN              | 권한 없음 (receiver만 거절 가능) |
| 404    | NOT_FOUND              | 친구 요청을 찾을 수 없음         |
| 500    | INTERNAL_ERROR         | 서버 오류                        |

---

## 기타

- 프론트엔드 처리 시 주의사항:
  - 친구 요청 거절 후 `useFriendRequests` hook을 refetch하여 목록에서 제거해야 합니다.
  - Optimistic update 가능: 거절 버튼 클릭 시 즉시 UI에서 제거 가능하지만, 실패 시 롤백 필요합니다.

- Empty / Loading / Error UX:
  - Loading: 거절 버튼 비활성화 및 로딩 표시
  - Error: 에러 메시지 표시
  - Success: 요청 목록에서 즉시 제거

---

## Change Log

| 날짜       | 변경 내용 | 작성자 |
| ---------- | --------- | ------ |
| 2026-01-12 | 최초 작성 | System |

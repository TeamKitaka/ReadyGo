# API 명세서

---

## 문서 정보

| 항목        | 내용                    |
| ----------- | ----------------------- |
| 작성자      | ReadyGo Team            |
| 최초 작성일 | 2026-01-12              |
| 최종 수정일 | 2026-01-12              |
| 관련 화면   | Notifications           |
| 관련 이슈   | 알림 시스템 구현        |

---

## 기능

- 알림을 읽음 처리합니다.
- 단일 알림 읽음 처리 또는 모든 읽지 않은 알림 읽음 처리를 지원합니다.
- `is_read` 필드가 `false`에서 `true`로 변경됩니다.

## 카테고리

- Notifications

## 설명

- 알림 수신함에서 특정 알림을 클릭하거나 "모두 읽음" 버튼을 클릭할 때 호출됩니다.
- `notificationId`가 제공되면 해당 알림만 읽음 처리합니다.
- `notificationId`가 제공되지 않으면 현재 사용자의 모든 읽지 않은 알림(`is_read: false`)을 읽음 처리합니다.

---

## Method

- POST

## URL

- `/api/notifications/mark-read`

---

## Param

### Path Parameter

없음

### Query Parameter

없음

---

## 사용자

- 로그인 필요: **필수**
- 접근 가능한 사용자: 인증된 모든 사용자 (자신의 알림만 읽음 처리 가능)

---

## Request

### Header

| key | 설명 | value 타입 | 필수 | 비고 |
| --- | ---- | ---------- | ---- | ---- |
| Cookie | Supabase 세션 쿠키 | string     | 필수 | 인증용 |

### Body

| key            | 설명                                    | value 타입 | 옵션 | Nullable | 예시 |
| -------------- | --------------------------------------- | ---------- | ---- | -------- | ---- |
| notificationId | 읽음 처리할 알림 ID (없으면 모두 읽음) | number     | 선택 | ⭕       | 1    |

---

## Response

### Body

| key     | 설명      | value 타입 | 옵션 | Nullable | 예시 |
| ------- | --------- | ---------- | ---- | -------- | ---- |
| success | 성공 여부 | boolean    | 필수 | ❌       | true |

### Example

```json
{
  "success": true
}
```

---

## Status

| status | response content            | 설명                           |
| ------ | --------------------------- | ------------------------------ |
| 200    | OK                          | 읽음 처리 성공                  |
| 401    | AUTH_REQUIRED               | 인증 필요                       |
| 500    | INTERNAL_ERROR              | 서버 오류                       |
| 500    | Failed to mark notification | 알림 읽음 처리 실패 (단일 알림) |
| 500    | Failed to mark all          | 모두 읽음 처리 실패             |

---

## 기타

- 프론트엔드 처리 시 주의사항:
  - 단일 알림 읽음 처리 후 `useNotifications` hook을 refetch하여 UI를 업데이트해야 합니다.
  - 모두 읽음 처리 후 `unreadCount`가 0으로 업데이트되어야 합니다.
  - Optimistic update 가능: 읽음 처리 버튼 클릭 시 즉시 UI에 반영 가능하지만, 실패 시 롤백 필요합니다.
  - "모두 읽음" 처리 시 `is_read: false`인 알림만 업데이트됩니다.

- Empty / Loading / Error UX:
  - Loading: 읽음 처리 중 버튼 비활성화 및 로딩 표시
  - Error: 에러 메시지 표시
  - Success: 알림의 `is_read` 상태 즉시 업데이트

---

## Change Log

| 날짜       | 변경 내용 | 작성자 |
| ---------- | --------- | ------ |
| 2026-01-12 | 최초 작성  | System |


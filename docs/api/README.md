# API Documentation

본 문서는 Next.js App Router 기반 API 명세서입니다.  
프론트엔드 개발자가 API를 빠르게 이해하고 바로 연동할 수 있도록 작성되었습니다.

---

## 공통 규칙

- Base URL: `/api`
- Data Format: `JSON`
- Encoding: `UTF-8`
- 인증: Supabase Auth 기반

---

## 문서 업데이트 규칙

### README.md 수정이 필요한 경우

다음 항목 중 하나라도 변경되면 README.md를 함께 수정한다.

- 인증 방식 변경 (예: Cookie → Bearer)
- 공통 Response 형식 변경
- 공통 Error Code 정책 변경
- Base URL 또는 API Prefix 변경
- API 카테고리 구조 변경

> ⚠️ 개별 API 변경만으로는 README를 수정하지 않는다.

---

### 개별 API 문서(md) 수정이 필요한 경우

다음 변경 사항이 있으면 **해당 API md 파일만 수정**한다.

- Request / Response 필드 추가·삭제·변경
- Param(Path / Query / Body) 변경
- Status Code 추가·변경
- 사용자 권한/조건 변경
- 프론트엔드 처리 방식(UX) 변경

---

### 수정 원칙

- 문서는 **프론트엔드 기준(contract)** 으로 작성한다.
- 서버 내부 구현(repository/service, DB 구조)은 문서에 포함하지 않는다.
- “프론트가 보내야 하는 값”만 Param에 작성한다.
- 불확실한 스펙은 명시적으로 주석 처리한다.

---

### 변경 이력 관리

- 각 API 문서는 하단의 **Change Log** 섹션에 변경 이력을 남긴다.
- README.md는 별도 변경 이력 관리하지 않는다.

---

## Auth

- **GET** `/api/auth/session`  
  → `auth/session.md`

---

## Steam

- **GET** `/api/steam/callback`  
  → `steam/callback.md`

- **POST** `/api/steam/sync-games`  
  → `steam/sync-games.md`

---

## Party

- **GET, POST** `/api/party`  
  → `party/index.md`

- **GET, PATCH, DELETE** `/api/party/:id`  
  → `party/id.md`

---

## Traits

- **POST** `/api/traits/submit`  
  → `traits/submit.md`

- **GET** `/api/traits/result`  
  → `traits/result.md`

---

## Friends

- **POST** `/api/friends/request`  
  → `friends/request.md`

- **POST** `/api/friends/accept`  
  → `friends/accept.md`

- **POST** `/api/friends/reject`  
  → `friends/reject.md`

- **GET** `/api/friends/list`  
  → `friends/list.md`

- **GET** `/api/friends/requests`  
  → `friends/requests.md`

---

## Notifications

- **GET** `/api/notifications`  
  → `notifications/index.md`

- **POST** `/api/notifications/mark-read`  
  → `notifications/mark-read.md`

---

## 공통 Response 형식

### Success

```json
{
  "ok": true,
  "data": {},
  "meta": null
}
```

### Error

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

---

## 공통 Status Code

| Status | Code             | 설명         |
| ------ | ---------------- | ------------ |
| 200    | OK               | 정상 처리    |
| 201    | CREATED          | 생성 성공    |
| 400    | VALIDATION_ERROR | 요청 값 오류 |
| 401    | AUTH_REQUIRED    | 인증 필요    |
| 403    | FORBIDDEN        | 권한 없음    |
| 404    | NOT_FOUND        | 리소스 없음  |
| 409    | CONFLICT         | 상태 충돌    |
| 500    | INTERNAL_ERROR   | 서버 오류    |

---

## 문서 작성 규칙

- `app/api/**/route.ts` 와 동일한 구조로 작성
- Dynamic route `[id]` → 문서에서는 `:id`
- Param에는 **프론트가 전달해야 하는 값만** 작성
- 서버 내부 처리 값은 명세서에 포함하지 않음

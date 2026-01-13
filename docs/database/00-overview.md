# Database Documentation Overview

이 디렉토리는 ReadyGo 서비스의
Supabase 기반 데이터베이스 구조를 문서화한다.

이 문서 묶음의 단일 기준(SSOT)은
`database.types.ts` 이다.

---

## Document Structure

| File                   | Description                      |
| ---------------------- | -------------------------------- |
| 01-schema-analysis.md  | 실제 Supabase 스키마 분석 (사실) |
| 02-domain-erd.md       | 도메인별 ERD                     |
| 03-full-erd.md         | 전체 통합 ERD                    |
| 04-table-details.md    | 각 테이블별 상세 정의            |
| 99-migrations-notes.md | 스키마 변경 이력                 |

---

## Source of Truth (SSOT)

우선순위는 다음과 같다:

1. Supabase 실제 DB
2. database.types.ts
3. 01-schema-analysis.md
4. ERD 문서

※ database.types.ts와 schema-analysis 문서는 반드시 동일 커밋에 포함되어야 한다.

---

## Update Policy

- DB 변경 후 반드시 타입 재생성
- 타입 변경 시 schema-analysis 문서 갱신
- schema-analysis는 사실만 기록
- ERD는 분석 문서 기준으로만 수정

---

## Scope

포함:

- public schema 테이블
- 물리적 FK / UNIQUE

제외:

- auth schema
- auth.users (논리적 참조만 허용)
- RLS 정책
- Trigger / Function

---

## How to Read

- DB 구조 확인 → 01-schema-analysis.md
- 도메인 관계 이해 → 02-domain-erd.md
- 전체 구조 파악 → 03-full-erd.md
- 각 테이블별 상세 정의 및 컬럼 → 04-table-details.md

---

## Stack

- Database: Supabase (PostgreSQL)
- Client Types: Supabase CLI
- Visualization: Mermaid

---

## Document Metadata

- **Author**: ReadyGo / Eunkyoung Kim(김은경)
- **Created At**: 2025-12-24
- **Last Updated At**: 2026-01-12
- **Document Version**: v1.0.0
- **Status**: Active
- **Source of Truth**:
  - Supabase Production Database
  - database.types.ts

## Version History

| Version | Date       | Description                             |
| ------: | ---------- | --------------------------------------- |
|  v1.0.0 | 2025-12-24 | Initial database documentation overview |

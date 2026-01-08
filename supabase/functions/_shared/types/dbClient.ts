/**
 * Database Client Interface
 *
 * Repository에서 사용하는 최소 DB 클라이언트 인터페이스
 * - Supabase 환경 (Node/Deno)에 독립적
 * - 실제 사용하는 메서드만 정의
 */

export interface DbClient {
  from: (table: string) => DbQueryBuilder;
}

export interface DbQueryBuilder {
  select: (columns?: string) => DbSelectBuilder;
  insert: (values: any) => Promise<DbResponse>;
  upsert: (
    values: any,
    options?: { onConflict?: string }
  ) => Promise<DbResponse>;
}

export interface DbSelectBuilder {
  eq: (column: string, value: any) => DbSelectBuilder;
  not: (column: string, operator: string, value: any) => DbSelectBuilder;
  in: (column: string, values: any[]) => DbSelectBuilder;
  limit: (count: number) => DbSelectBuilder;
  maybeSingle: () => Promise<DbResponse>;
  then: (onfulfilled?: (value: DbResponse) => any) => Promise<any>;
}

export interface DbResponse {
  data: any;
  error: DbError | null;
}

export interface DbError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

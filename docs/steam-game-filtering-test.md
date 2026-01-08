# Steam 게임 필터링 테스트 가이드

## 구현 내용

Steam API로부터 받은 항목 중 실제 게임만 필터링하여 동기화하는 기능이 추가되었습니다.

### 주요 변경사항

1. **steam_game_info 캐시 활용**
   - 이미 확인된 게임은 Store API 호출 없이 즉시 동기화
   - 새로운 app_id만 Store API로 검증

2. **게임 유형 검증**
   - Steam Store API를 호출하여 `type='game'` 확인
   - 게임이 아닌 항목(DLC, 소프트웨어, 사운드트랙 등)은 자동 제외

3. **성능 최적화**
   - 배치 조회: 1000개 app_id를 한 번에 확인
   - Rate limit 대응: 10개마다 100ms 대기
   - 캐시 히트율 예상: 95% 이상

## 테스트 시나리오

### 1️⃣ 캐시 히트 테스트 (빠른 동기화)

**목적**: 이미 확인된 게임만 보유한 유저의 빠른 동기화 확인

**절차**:
```bash
# 1. 인기 게임만 보유한 테스트 유저로 동기화
curl -X POST http://localhost:3000/api/steam/sync \
  -H "Cookie: your-session-cookie"
```

**기대 결과**:
- Edge Function 로그: `Store API calls: 0` (또는 매우 적은 수)
- 빠른 동기화 완료 (1-2초)
- `steam_user_games`에 게임 저장 확인

### 2️⃣ 게임/비게임 혼합 테스트

**목적**: DLC, 소프트웨어 등이 포함된 계정에서 필터링 확인

**절차**:
```bash
# 1. 동기화 실행
curl -X POST http://localhost:3000/api/steam/sync \
  -H "Cookie: your-session-cookie"

# 2. 로그 확인
# - 콘솔에서 "Filtered X items → Y games (Z Store API calls)" 확인
# - X > Y 이면 필터링 작동

# 3. DB 확인
SELECT COUNT(*) FROM steam_user_games WHERE user_id = 'your-user-id';
# → 실제 게임 수만 저장되어야 함
```

**기대 결과**:
- 원본 항목 수 > 저장된 게임 수
- 비게임 항목은 `steam_user_games`에 저장되지 않음
- `steam_game_info`에는 게임만 추가됨

### 3️⃣ 새로운 게임 추가 테스트

**목적**: 새로 출시된 게임이 올바르게 추가되는지 확인

**전제 조건**:
```sql
-- 테스트할 app_id가 steam_game_info에 없는지 확인
SELECT * FROM steam_game_info WHERE app_id = 730; -- CS:GO 예시
-- 없으면 삭제: DELETE FROM steam_game_info WHERE app_id = 730;
```

**절차**:
```bash
# 1. 동기화 실행
curl -X POST http://localhost:3000/api/steam/sync \
  -H "Cookie: your-session-cookie"

# 2. steam_game_info에 추가되었는지 확인
SELECT * FROM steam_game_info WHERE app_id = 730;
```

**기대 결과**:
- Store API 호출 로그 확인
- `steam_game_info`에 게임 정보 저장
- `steam_user_games`에도 동기화

### 4️⃣ 배치 동기화 테스트 (Edge Function)

**목적**: 여러 유저 동기화 시 필터링 작동 확인

**절차**:
```bash
# Edge Function 호출
curl -L -X POST 'https://wwyavdsmukthfioqlldn.supabase.co/functions/v1/steam-sync-batch' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'apikey: YOUR_ANON_KEY'
```

**기대 결과**:
- 각 유저별 필터링 로그 출력
- Store API 호출 횟수 확인
- 메모리 초과 없이 완료

## 예상 로그 출력

### Node.js (개별 동기화)
```
[Steam API] Successfully fetched 245 games
[Steam Sync] Filtered 245 items → 230 games (15 Store API calls)
```

### Deno (배치 동기화)
```
[Sync User abc123] Filtering 180 items (checking steam_game_info cache)
[Sync User abc123] Filtered 180 items → 175 games (5 Store API calls)
[Sync User abc123] Upserting 175 games to DB
[Sync User abc123] Successfully synced 175 games
```

## 성능 지표

### 캐시 히트율
- **목표**: 95% 이상
- **측정**: `(전체 게임 수 - Store API 호출 수) / 전체 게임 수`

### 동기화 시간
- **캐시 히트 (1000게임)**: 1-2초
- **캐시 미스 포함 (50개 검증)**: 10-15초
- **배치 (50명)**: 2-5분

## 검증 쿼리

### 1. 필터링 효과 확인
```sql
-- 원본 vs 필터링 비교 (수동 확인)
-- Steam API 응답 로그에서 total 확인
-- steam_user_games에서 실제 저장된 개수 확인
SELECT user_id, COUNT(*) as synced_games
FROM steam_user_games
GROUP BY user_id;
```

### 2. steam_game_info 증가 추이
```sql
-- 새로운 게임이 추가되는지 확인
SELECT COUNT(*) as total_games FROM steam_game_info;
-- 동기화 후 다시 실행하여 비교
```

### 3. 동기화 로그 확인
```sql
-- 최근 동기화 상태
SELECT 
  user_id,
  status,
  synced_games_count,
  synced_at
FROM steam_sync_logs
ORDER BY synced_at DESC
LIMIT 20;
```

### 4. 게임 타입 확인 (샘플)
```sql
-- steam_game_info에 저장된 게임들이 실제 게임인지 확인
SELECT app_id, name, genres
FROM steam_game_info
ORDER BY created_at DESC
LIMIT 10;
```

## 문제 해결

### 문제: Store API 호출이 너무 많음
**원인**: 캐시 미스가 많음
**해결**: 
1. `steam_game_info`에 인기 게임 미리 추가
2. 배치 크기 줄이기 (50 → 20)

### 문제: 일부 게임이 동기화되지 않음
**원인**: Store API 에러 또는 Rate Limit
**확인**: 
```bash
# Edge Function 로그 확인
# "Failed to save game info" 메시지 검색
```
**해결**: Rate limit 대기 시간 증가 (100ms → 200ms)

### 문제: 게임이 아닌 항목이 저장됨
**원인**: Store API 검증 우회
**확인**:
```sql
-- steam_game_info에서 genres가 비어있는 항목 확인
SELECT * FROM steam_game_info WHERE genres IS NULL OR genres = '{}';
```

## 결론

모든 테스트가 통과하면 다음을 확인할 수 있습니다:

✅ 게임만 선택적으로 동기화
✅ steam_game_info 캐시로 성능 최적화
✅ 비게임 항목(DLC, 소프트웨어) 자동 제외
✅ 새로운 게임 자동 검증 및 저장
✅ 배치 동기화에서도 정상 작동


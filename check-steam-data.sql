-- steam_user_games 현황 확인
SELECT 
  COUNT(DISTINCT user_id) as total_users,
  COUNT(*) as total_game_records
FROM steam_user_games;

-- 유저별 게임 수
SELECT 
  user_id,
  COUNT(*) as game_count,
  MAX(created_at) as last_synced
FROM steam_user_games
GROUP BY user_id
ORDER BY last_synced DESC
LIMIT 20;

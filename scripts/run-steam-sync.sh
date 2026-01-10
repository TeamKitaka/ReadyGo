#!/bin/bash

# Steam 동기화 자동화 스크립트
# 98개 계정을 10회에 걸쳐 동기화 (10명씩)

cd "$(dirname "$0")/.."

SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d'=' -f2)

echo "=========================================="
echo "Steam Sync Automation (10 runs)"
echo "=========================================="
echo ""

for i in {1..10}
do
  echo "[$i/10] Starting sync batch..."
  
  response=$(curl -s -X POST \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    https://wwyavdsmukthfioqlldn.supabase.co/functions/v1/steam-sync-batch \
    --max-time 180)
  
  echo "$response"
  
  # 결과 파싱
  success=$(echo "$response" | grep -o '"success":[0-9]*' | cut -d':' -f2)
  total=$(echo "$response" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  
  if [ -n "$success" ] && [ -n "$total" ]; then
    echo "✅ Completed: $success/$total"
  fi
  
  echo ""
  
  # 마지막 실행이 아니면 5초 대기
  if [ $i -lt 10 ]; then
    echo "⏳ Waiting 5 seconds before next run..."
    sleep 5
    echo ""
  fi
done

echo "=========================================="
echo "✅ All sync batches completed!"
echo "=========================================="
echo ""
echo "💡 Check Supabase Dashboard for sync results"
echo "💡 Next: Run steam-stats-update in batch mode"
echo ""


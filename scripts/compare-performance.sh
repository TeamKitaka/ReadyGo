#!/bin/bash

# 매칭 시스템 성능 비교 스크립트
# 
# 사용법:
#   chmod +x scripts/compare-performance.sh
#   ./scripts/compare-performance.sh

set -e

echo "╔═══════════════════════════════════════════════════╗"
echo "║       매칭 시스템 성능 비교                       ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 현재 브랜치 저장
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}📍 현재 브랜치: ${CURRENT_BRANCH}${NC}"
echo ""

# 결과 디렉토리 생성
RESULTS_DIR="performance-results"
mkdir -p $RESULTS_DIR

# 타임스탬프
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  이전 버전 측정 (캐싱 도입 전)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 이전 버전으로 체크아웃 (캐싱 도입 전)
echo -e "${YELLOW}⏪ 커밋 379f72f로 체크아웃...${NC}"
git checkout 379f72f

# 의존성 설치
echo -e "${YELLOW}📦 의존성 설치...${NC}"
npm install --silent

# 성능 측정
echo -e "${YELLOW}📊 성능 측정 중...${NC}"
npx tsx scripts/measure-matching-performance.ts > "$RESULTS_DIR/before_${TIMESTAMP}.txt" 2>&1 || true

echo -e "${GREEN}✅ 이전 버전 측정 완료${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  현재 버전 측정 (캐싱 도입 후)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 현재 버전으로 복귀
echo -e "${YELLOW}⏩ ${CURRENT_BRANCH} 브랜치로 복귀...${NC}"
git checkout $CURRENT_BRANCH

# 의존성 설치
echo -e "${YELLOW}📦 의존성 설치...${NC}"
npm install --silent

# 성능 측정
echo -e "${YELLOW}📊 성능 측정 중...${NC}"
npx tsx scripts/measure-matching-performance.ts > "$RESULTS_DIR/after_${TIMESTAMP}.txt" 2>&1 || true

echo -e "${GREEN}✅ 현재 버전 측정 완료${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  결과 비교"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 결과 파일 확인
if [ -f "$RESULTS_DIR/before_${TIMESTAMP}.txt" ] && [ -f "$RESULTS_DIR/after_${TIMESTAMP}.txt" ]; then
    echo -e "${BLUE}📄 이전 버전 결과:${NC}"
    echo "─────────────────────────────────────────────────"
    tail -20 "$RESULTS_DIR/before_${TIMESTAMP}.txt"
    echo ""
    
    echo -e "${BLUE}📄 현재 버전 결과:${NC}"
    echo "─────────────────────────────────────────────────"
    tail -20 "$RESULTS_DIR/after_${TIMESTAMP}.txt"
    echo ""
    
    echo -e "${GREEN}✅ 결과 파일 저장 완료:${NC}"
    echo "   - $RESULTS_DIR/before_${TIMESTAMP}.txt"
    echo "   - $RESULTS_DIR/after_${TIMESTAMP}.txt"
    echo ""
    
    # diff 생성
    echo -e "${BLUE}📊 차이점:${NC}"
    echo "─────────────────────────────────────────────────"
    diff "$RESULTS_DIR/before_${TIMESTAMP}.txt" "$RESULTS_DIR/after_${TIMESTAMP}.txt" || true
    echo ""
else
    echo -e "${RED}❌ 결과 파일을 찾을 수 없습니다.${NC}"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  요약"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 평균 응답 시간 추출 (간단한 버전)
BEFORE_HOME=$(grep "홈 화면" "$RESULTS_DIR/before_${TIMESTAMP}.txt" | grep "평균" | awk '{print $2}' | sed 's/ms//' || echo "N/A")
AFTER_HOME=$(grep "홈 화면" "$RESULTS_DIR/after_${TIMESTAMP}.txt" | grep "평균" | awk '{print $2}' | sed 's/ms//' || echo "N/A")

BEFORE_MATCH=$(grep "매칭 화면 (12개, 캐시 미스)" "$RESULTS_DIR/before_${TIMESTAMP}.txt" | grep "평균" | awk '{print $2}' | sed 's/ms//' || echo "N/A")
AFTER_MATCH=$(grep "매칭 화면 (12개, 캐시 미스)" "$RESULTS_DIR/after_${TIMESTAMP}.txt" | grep "평균" | awk '{print $2}' | sed 's/ms//' || echo "N/A")

echo "📊 홈 화면 (4개)"
echo "   이전: ${BEFORE_HOME}ms"
echo "   현재: ${AFTER_HOME}ms"
echo ""

echo "📊 매칭 화면 (12개, 캐시 미스)"
echo "   이전: ${BEFORE_MATCH}ms"
echo "   현재: ${AFTER_MATCH}ms"
echo ""

echo -e "${GREEN}✅ 성능 비교 완료!${NC}"
echo ""
echo "💡 팁: 자세한 결과는 다음 파일을 확인하세요:"
echo "   - $RESULTS_DIR/before_${TIMESTAMP}.txt"
echo "   - $RESULTS_DIR/after_${TIMESTAMP}.txt"
echo ""


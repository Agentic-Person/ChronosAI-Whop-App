#!/bin/bash

# Load Test Execution Script
# Runs Artillery load tests with proper configuration and reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOAD_TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESULTS_DIR="${LOAD_TESTS_DIR}/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Default values
TARGET_URL="${TARGET_URL:-http://localhost:3000}"
SCENARIO="${1:-chat-load}"
REPORT_FORMAT="${REPORT_FORMAT:-json,html}"

# Print banner
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════╗"
echo "║   AI Video Learning Assistant - Load Testing  ║"
echo "╔════════════════════════════════════════════════╗"
echo -e "${NC}"

# Validate environment
echo -e "${YELLOW}⚙️  Validating environment...${NC}"

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo -e "${RED}❌ Error: NEXT_PUBLIC_SUPABASE_URL not set${NC}"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not set${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Environment validated${NC}"

# Create results directory
mkdir -p "${RESULTS_DIR}"

# Display configuration
echo -e "\n${BLUE}📋 Test Configuration:${NC}"
echo "   Target URL: ${TARGET_URL}"
echo "   Scenario: ${SCENARIO}"
echo "   Results: ${RESULTS_DIR}/${SCENARIO}_${TIMESTAMP}"
echo "   Report Format: ${REPORT_FORMAT}"

# Check if target is reachable
echo -e "\n${YELLOW}🔍 Checking target availability...${NC}"
if curl -s --head --max-time 5 "${TARGET_URL}" > /dev/null; then
  echo -e "${GREEN}✅ Target is reachable${NC}"
else
  echo -e "${RED}❌ Warning: Target may not be reachable${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Run the load test
echo -e "\n${YELLOW}🚀 Starting load test: ${SCENARIO}...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

SCENARIO_FILE="${LOAD_TESTS_DIR}/artillery/scenarios/${SCENARIO}.yml"

if [ ! -f "$SCENARIO_FILE" ]; then
  echo -e "${RED}❌ Error: Scenario file not found: ${SCENARIO_FILE}${NC}"
  exit 1
fi

# Export environment variables for Artillery
export TARGET_URL
export TIMESTAMP

# Run Artillery with output capture
REPORT_FILE="${RESULTS_DIR}/${SCENARIO}_${TIMESTAMP}"

npx artillery run \
  --config "${LOAD_TESTS_DIR}/artillery/artillery.config.yml" \
  --output "${REPORT_FILE}.json" \
  "$SCENARIO_FILE"

ARTILLERY_EXIT_CODE=$?

# Generate HTML report
echo -e "\n${YELLOW}📊 Generating report...${NC}"
npx artillery report "${REPORT_FILE}.json" --output "${REPORT_FILE}.html"

# Display results
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $ARTILLERY_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Load test completed successfully!${NC}"
else
  echo -e "${RED}❌ Load test failed with exit code: ${ARTILLERY_EXIT_CODE}${NC}"
fi

echo -e "\n${BLUE}📈 Results Location:${NC}"
echo "   JSON: ${REPORT_FILE}.json"
echo "   HTML: ${REPORT_FILE}.html"

# Parse and display key metrics
echo -e "\n${BLUE}📊 Quick Summary:${NC}"
if command -v jq &> /dev/null; then
  echo -e "${GREEN}"
  jq -r '
    .aggregate |
    "   Total Requests: \(.requestsCompleted // 0)",
    "   Success Rate: \((((.codes."200" // 0) / (.requestsCompleted // 1)) * 100) | floor)%",
    "   Median Response Time: \(.latency.median // 0)ms",
    "   95th Percentile: \(.latency.p95 // 0)ms",
    "   99th Percentile: \(.latency.p99 // 0)ms",
    "   Errors: \(.errors // 0)"
  ' "${REPORT_FILE}.json" 2>/dev/null || echo "   (Run 'jq' to parse detailed metrics)"
  echo -e "${NC}"
else
  echo "   Install 'jq' to see detailed metrics summary"
fi

# Open HTML report
if [ "${OPEN_REPORT:-true}" = "true" ]; then
  echo -e "\n${YELLOW}🌐 Opening HTML report in browser...${NC}"
  if command -v xdg-open &> /dev/null; then
    xdg-open "${REPORT_FILE}.html"
  elif command -v open &> /dev/null; then
    open "${REPORT_FILE}.html"
  elif command -v start &> /dev/null; then
    start "${REPORT_FILE}.html"
  fi
fi

# Suggest next steps
echo -e "\n${BLUE}💡 Next Steps:${NC}"
echo "   1. Review detailed metrics in HTML report"
echo "   2. Check for errors and bottlenecks"
echo "   3. Compare with baseline metrics"
echo "   4. Run additional scenarios if needed"

echo -e "\n${BLUE}🔧 Available Test Scenarios:${NC}"
echo "   - chat-load: RAG chat system load test"
echo "   - video-upload-load: Video upload pipeline test"
echo "   - auth-load: Authentication flow test"
echo "   - database-load: Database connection pool test"
echo "   - api-rate-limit-test: Rate limit validation"

echo -e "\n${GREEN}Done!${NC}\n"

exit $ARTILLERY_EXIT_CODE

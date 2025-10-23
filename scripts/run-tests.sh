#!/bin/bash

# Whop Integration Test Runner
# Comprehensive script to run all tests with proper setup and reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Whop Integration Test Suite Runner                 ║"
echo "║   Phase 1: OAuth, Webhooks, Multi-Tenant RAG        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Parse arguments
RUN_UNIT=true
RUN_INTEGRATION=false
RUN_COVERAGE=false
SETUP_DATA=false
CLEAR_DATA=false
WATCH_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --unit)
      RUN_UNIT=true
      shift
      ;;
    --integration)
      RUN_INTEGRATION=true
      shift
      ;;
    --coverage)
      RUN_COVERAGE=true
      shift
      ;;
    --setup-data)
      SETUP_DATA=true
      shift
      ;;
    --clear-data)
      CLEAR_DATA=true
      shift
      ;;
    --watch)
      WATCH_MODE=true
      shift
      ;;
    --all)
      RUN_UNIT=true
      RUN_INTEGRATION=true
      shift
      ;;
    --help)
      echo "Usage: ./scripts/run-tests.sh [options]"
      echo ""
      echo "Options:"
      echo "  --unit           Run unit tests (default)"
      echo "  --integration    Run integration tests"
      echo "  --all            Run all tests"
      echo "  --coverage       Generate coverage report"
      echo "  --setup-data     Setup test data before running tests"
      echo "  --clear-data     Clear test data before setup"
      echo "  --watch          Run tests in watch mode"
      echo "  --help           Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./scripts/run-tests.sh                    # Run unit tests"
      echo "  ./scripts/run-tests.sh --all --coverage   # Run all with coverage"
      echo "  ./scripts/run-tests.sh --setup-data       # Setup data and run tests"
      echo "  ./scripts/run-tests.sh --watch            # Watch mode"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Run './scripts/run-tests.sh --help' for usage"
      exit 1
      ;;
  esac
done

# Check Node.js version
echo -e "${BLUE}🔍 Checking Node.js version...${NC}"
NODE_VERSION=$(node -v)
echo "   Node.js: $NODE_VERSION"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo -e "${YELLOW}⚠️  Warning: .env.local not found${NC}"
  echo "   Create .env.local with required environment variables"
  echo "   See .env.example for reference"
  echo ""
fi

# Setup test data if requested
if [ "$SETUP_DATA" = true ] || [ "$CLEAR_DATA" = true ]; then
  echo -e "${BLUE}📦 Setting up test data...${NC}"

  if [ "$CLEAR_DATA" = true ]; then
    tsx scripts/setup-test-data.ts --clear
  else
    tsx scripts/setup-test-data.ts
  fi

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test data setup complete${NC}"
  else
    echo -e "${RED}❌ Test data setup failed${NC}"
    exit 1
  fi
  echo ""
fi

# Clear Jest cache
echo -e "${BLUE}🧹 Clearing Jest cache...${NC}"
npx jest --clearCache
echo ""

# Run unit tests
if [ "$RUN_UNIT" = true ]; then
  echo -e "${BLUE}🧪 Running Unit Tests...${NC}"
  echo "════════════════════════════════════════════════════════"
  echo ""

  if [ "$WATCH_MODE" = true ]; then
    npm run test:watch
    exit 0
  elif [ "$RUN_COVERAGE" = true ]; then
    npm test -- --coverage --verbose
  else
    npm test -- --verbose
  fi

  UNIT_EXIT_CODE=$?

  if [ $UNIT_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Unit tests passed${NC}"
  else
    echo ""
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit $UNIT_EXIT_CODE
  fi
  echo ""
fi

# Run integration tests
if [ "$RUN_INTEGRATION" = true ]; then
  echo -e "${BLUE}🔗 Running Integration Tests...${NC}"
  echo "════════════════════════════════════════════════════════"
  echo ""

  if [ "$RUN_COVERAGE" = true ]; then
    npm run test:integration -- --coverage --verbose
  else
    npm run test:integration -- --verbose
  fi

  INTEGRATION_EXIT_CODE=$?

  if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Integration tests passed${NC}"
  else
    echo ""
    echo -e "${RED}❌ Integration tests failed${NC}"
    exit $INTEGRATION_EXIT_CODE
  fi
  echo ""
fi

# Display coverage report location
if [ "$RUN_COVERAGE" = true ]; then
  echo ""
  echo -e "${BLUE}📊 Coverage Report Generated${NC}"
  echo "════════════════════════════════════════════════════════"
  echo "   HTML Report: coverage/lcov-report/index.html"
  echo "   Open with: open coverage/lcov-report/index.html"
  echo ""
fi

# Display summary
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║              Test Run Complete                        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

if [ "$RUN_UNIT" = true ]; then
  if [ $UNIT_EXIT_CODE -eq 0 ]; then
    echo -e "  Unit Tests:        ${GREEN}PASSED ✓${NC}"
  else
    echo -e "  Unit Tests:        ${RED}FAILED ✗${NC}"
  fi
fi

if [ "$RUN_INTEGRATION" = true ]; then
  if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
    echo -e "  Integration Tests: ${GREEN}PASSED ✓${NC}"
  else
    echo -e "  Integration Tests: ${RED}FAILED ✗${NC}"
  fi
fi

echo ""
echo -e "${BLUE}📝 Test Documentation:${NC}"
echo "  • Manual Testing: WHOP_TESTING_GUIDE.md"
echo "  • Test Infrastructure: TESTING_README.md"
echo "  • Summary: WHOP_TESTING_SUMMARY.md"
echo ""

# Exit with appropriate code
if [ "$RUN_UNIT" = true ] && [ $UNIT_EXIT_CODE -ne 0 ]; then
  exit $UNIT_EXIT_CODE
fi

if [ "$RUN_INTEGRATION" = true ] && [ $INTEGRATION_EXIT_CODE -ne 0 ]; then
  exit $INTEGRATION_EXIT_CODE
fi

exit 0

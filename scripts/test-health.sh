#!/bin/bash

##############################################
# Health Check Test Script
##############################################
#
# Tests the health endpoint of a deployed application.
# Validates database, cache, and overall service health.
#
# Usage:
#   ./scripts/test-health.sh <url>
#
# Examples:
#   ./scripts/test-health.sh https://mentora.vercel.app
#   ./scripts/test-health.sh http://localhost:3000
#
# Exit Codes:
#   0 - All health checks passed
#   1 - Some health checks failed
#   2 - Invalid arguments or setup error
##############################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

##############################################
# Helper Functions
##############################################

log_info() {
  echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_section() {
  echo ""
  echo -e "${CYAN}========================================${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}========================================${NC}"
  echo ""
}

##############################################
# Argument Validation
##############################################

if [ $# -eq 0 ]; then
  echo "Usage: $0 <url>"
  echo ""
  echo "Examples:"
  echo "  $0 https://mentora.vercel.app"
  echo "  $0 http://localhost:3000"
  exit 2
fi

BASE_URL=$1

# Remove trailing slash if present
BASE_URL=${BASE_URL%/}

# Validate URL format
if [[ ! $BASE_URL =~ ^https?:// ]]; then
  log_error "Invalid URL format. Must start with http:// or https://"
  echo ""
  echo "Usage: $0 <url>"
  exit 2
fi

##############################################
# Check Dependencies
##############################################

if ! command -v curl &> /dev/null; then
  log_error "curl is not installed. Please install it first."
  exit 2
fi

# Check for jq (optional but recommended)
HAS_JQ=false
if command -v jq &> /dev/null; then
  HAS_JQ=true
fi

##############################################
# Run Health Checks
##############################################

log_section "🏥 Health Check for: $BASE_URL"

HEALTH_URL="$BASE_URL/api/health"
FAILED_CHECKS=0

##############################################
# 1. Check Connectivity
##############################################

log_info "Testing connectivity..."

if curl -f -s -o /dev/null "$BASE_URL"; then
  log_success "Base URL is accessible"
else
  log_error "Cannot reach $BASE_URL"
  log_info "Check if the application is deployed and running"
  exit 1
fi

##############################################
# 2. Check Health Endpoint
##############################################

log_info "Testing health endpoint..."

# Create temporary file for response
RESPONSE_FILE=$(mktemp)
trap "rm -f $RESPONSE_FILE" EXIT

# Make request to health endpoint
HTTP_STATUS=$(curl -s -o "$RESPONSE_FILE" -w "%{http_code}" "$HEALTH_URL")

if [ "$HTTP_STATUS" -eq 200 ]; then
  log_success "Health endpoint returned HTTP 200"
elif [ "$HTTP_STATUS" -eq 503 ]; then
  log_warning "Health endpoint returned HTTP 503 (service degraded)"
  ((FAILED_CHECKS++))
else
  log_error "Health endpoint returned HTTP $HTTP_STATUS"
  cat "$RESPONSE_FILE"
  exit 1
fi

##############################################
# 3. Parse Health Response
##############################################

log_info "Parsing health response..."

if [ "$HAS_JQ" = true ]; then
  # Parse with jq (structured output)
  OVERALL_STATUS=$(jq -r '.status' "$RESPONSE_FILE" 2>/dev/null || echo "unknown")
  TIMESTAMP=$(jq -r '.timestamp' "$RESPONSE_FILE" 2>/dev/null || echo "unknown")

  echo ""
  log_info "Overall Status: ${CYAN}$OVERALL_STATUS${NC}"
  log_info "Timestamp: $TIMESTAMP"
  echo ""

  # Check if checks field exists
  if jq -e '.checks' "$RESPONSE_FILE" > /dev/null 2>&1; then
    log_section "Component Health Checks"

    ##############################################
    # 4. Database Health
    ##############################################

    if jq -e '.checks.database' "$RESPONSE_FILE" > /dev/null 2>&1; then
      DB_STATUS=$(jq -r '.checks.database.status' "$RESPONSE_FILE")
      DB_LATENCY=$(jq -r '.checks.database.latency' "$RESPONSE_FILE")

      if [ "$DB_STATUS" = "ok" ]; then
        log_success "Database: OK (latency: ${DB_LATENCY}ms)"
      else
        DB_ERROR=$(jq -r '.checks.database.error' "$RESPONSE_FILE")
        log_error "Database: ERROR - $DB_ERROR"
        ((FAILED_CHECKS++))
      fi
    else
      log_warning "Database check not found in response"
    fi

    ##############################################
    # 5. Cache Health
    ##############################################

    if jq -e '.checks.cache' "$RESPONSE_FILE" > /dev/null 2>&1; then
      CACHE_STATUS=$(jq -r '.checks.cache.status' "$RESPONSE_FILE")
      CACHE_LATENCY=$(jq -r '.checks.cache.latency' "$RESPONSE_FILE")

      if [ "$CACHE_STATUS" = "ok" ]; then
        log_success "Cache: OK (latency: ${CACHE_LATENCY}ms)"
      else
        log_warning "Cache: ERROR (non-critical)"
        log_info "Application can run without cache but performance may be degraded"
      fi
    else
      log_warning "Cache check not found in response"
    fi

    ##############################################
    # 6. Overall Status Evaluation
    ##############################################

    echo ""
    log_section "Health Summary"

    case "$OVERALL_STATUS" in
      healthy)
        log_success "System is HEALTHY - all checks passed"
        ;;
      degraded)
        log_warning "System is DEGRADED - some non-critical services unavailable"
        log_info "Core functionality should still work"
        ((FAILED_CHECKS++))
        ;;
      unhealthy)
        log_error "System is UNHEALTHY - critical services unavailable"
        log_info "Application may not function correctly"
        ((FAILED_CHECKS++))
        ;;
      *)
        log_warning "Unknown health status: $OVERALL_STATUS"
        ((FAILED_CHECKS++))
        ;;
    esac

  else
    log_warning "No component checks found in response"
    log_info "Response format may have changed"
  fi

else
  # No jq available - show raw response
  log_warning "jq not installed - showing raw response"
  echo ""
  cat "$RESPONSE_FILE"
  echo ""

  # Basic validation
  if grep -q '"status"' "$RESPONSE_FILE"; then
    log_success "Health response contains status field"
  else
    log_error "Health response missing status field"
    ((FAILED_CHECKS++))
  fi
fi

##############################################
# 7. Response Time Check
##############################################

log_section "Performance Checks"

log_info "Testing response time..."

# Measure response time
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$HEALTH_URL")
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc)

log_info "Health endpoint response time: ${CYAN}${RESPONSE_TIME_MS}ms${NC}"

# Validate response time (warn if >2000ms)
THRESHOLD=2000
if (( $(echo "$RESPONSE_TIME_MS < $THRESHOLD" | bc -l) )); then
  log_success "Response time is acceptable (<2000ms)"
else
  log_warning "Response time is slow (>${THRESHOLD}ms)"
  log_info "This may indicate performance issues"
  ((FAILED_CHECKS++))
fi

##############################################
# 8. Additional Endpoint Checks (Optional)
##############################################

log_section "Additional Endpoint Checks"

# Test homepage
log_info "Testing homepage (/)..."
HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$HOME_STATUS" -eq 200 ]; then
  log_success "Homepage accessible (HTTP 200)"
else
  log_warning "Homepage returned HTTP $HOME_STATUS"
fi

# Test API route (expect 401 without auth - that's OK)
log_info "Testing API authentication..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/student/chat")
if [ "$API_STATUS" -eq 401 ]; then
  log_success "API authentication working (HTTP 401 expected)"
elif [ "$API_STATUS" -eq 200 ]; then
  log_success "API route accessible (HTTP 200)"
else
  log_warning "API route returned HTTP $API_STATUS"
fi

# Test static assets
log_info "Testing static assets..."
# Try to fetch favicon or any static file
STATIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/favicon.ico")
if [ "$STATIC_STATUS" -eq 200 ]; then
  log_success "Static assets accessible"
else
  log_info "Static asset returned HTTP $STATIC_STATUS (may not exist)"
fi

##############################################
# Final Summary
##############################################

echo ""
log_section "Final Results"

if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                                        ║${NC}"
  echo -e "${GREEN}║   ✓ All Health Checks Passed!         ║${NC}"
  echo -e "${GREEN}║                                        ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
  echo ""
  log_success "Application is healthy and ready for use"
  exit 0
else
  echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║                                        ║${NC}"
  echo -e "${YELLOW}║   ⚠ Some Health Checks Failed         ║${NC}"
  echo -e "${YELLOW}║                                        ║${NC}"
  echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
  echo ""
  log_warning "$FAILED_CHECKS check(s) failed"
  log_info "Review the output above for details"
  echo ""
  echo "Troubleshooting steps:"
  echo "  1. Check application logs: vercel logs --follow"
  echo "  2. Verify environment variables in Vercel dashboard"
  echo "  3. Check database connectivity in Supabase dashboard"
  echo "  4. Review PRODUCTION_ENV_CHECKLIST.md for missing variables"
  echo "  5. See docs/STAGING_DEPLOYMENT.md for troubleshooting guide"
  echo ""
  exit 1
fi

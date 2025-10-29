#!/bin/bash

##############################################
# Production Rollback Script
##############################################
#
# This script handles emergency rollback to a previous deployment
#
# Usage: ./scripts/rollback.sh [deployment-url]
#
# If no deployment URL is provided, rolls back to the previous production deployment
#
# Examples:
#   ./scripts/rollback.sh                              # Rollback to previous
#   ./scripts/rollback.sh https://app-abc123.vercel.app # Rollback to specific
##############################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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

confirm() {
  read -p "$(echo -e ${YELLOW}$1 \(y/N\):${NC} )" -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    return 1
  fi
  return 0
}

check_command() {
  if ! command -v $1 &> /dev/null; then
    log_error "$1 is not installed. Please install it first."
    exit 1
  fi
}

##############################################
# Pre-flight Checks
##############################################

log_section "🔄 Production Rollback"

check_command vercel
log_success "Vercel CLI available"

##############################################
# Get Target Deployment
##############################################

TARGET_DEPLOYMENT=$1

if [ -z "$TARGET_DEPLOYMENT" ]; then
  log_info "No deployment specified, fetching recent deployments..."

  # List recent deployments
  log_info "Recent production deployments:"
  echo ""

  # Get deployments (format: URL, Created, State)
  DEPLOYMENTS=$(vercel ls --prod | grep "READY" | head -5)

  if [ -z "$DEPLOYMENTS" ]; then
    log_error "No ready deployments found"
    exit 1
  fi

  echo "$DEPLOYMENTS" | nl -w2 -s'. '
  echo ""

  # Get current production URL
  CURRENT_PROD=$(vercel ls --prod | grep "READY" | head -1 | awk '{print $1}')
  log_warning "Current production: $CURRENT_PROD"

  # Get previous deployment (second in list)
  PREV_DEPLOYMENT=$(vercel ls --prod | grep "READY" | head -2 | tail -1 | awk '{print $1}')

  if [ -z "$PREV_DEPLOYMENT" ]; then
    log_error "No previous deployment found to rollback to"
    exit 1
  fi

  log_info "Previous deployment: $PREV_DEPLOYMENT"

  if ! confirm "Rollback to previous deployment?"; then
    echo ""
    read -p "Enter deployment number or URL: " USER_INPUT

    if [[ "$USER_INPUT" =~ ^[0-9]+$ ]]; then
      # User entered a number
      TARGET_DEPLOYMENT=$(echo "$DEPLOYMENTS" | sed -n "${USER_INPUT}p" | awk '{print $1}')
    else
      # User entered a URL
      TARGET_DEPLOYMENT=$USER_INPUT
    fi
  else
    TARGET_DEPLOYMENT=$PREV_DEPLOYMENT
  fi
fi

if [ -z "$TARGET_DEPLOYMENT" ]; then
  log_error "No target deployment specified"
  exit 1
fi

##############################################
# Verify Target Deployment
##############################################

log_section "🔍 Verifying Target Deployment"

log_info "Target deployment: $TARGET_DEPLOYMENT"

# Extract deployment ID if full URL provided
if [[ "$TARGET_DEPLOYMENT" == https://* ]]; then
  DEPLOYMENT_ID=$(echo "$TARGET_DEPLOYMENT" | sed 's|https://||' | cut -d'.' -f1)
else
  DEPLOYMENT_ID=$TARGET_DEPLOYMENT
fi

log_info "Deployment ID: $DEPLOYMENT_ID"

# Check deployment status
log_info "Checking deployment health..."
HEALTH_URL="https://${DEPLOYMENT_ID}.vercel.app/health"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [ "$HTTP_STATUS" -eq 000 ]; then
  log_error "Cannot reach deployment - deployment may not exist"
  if ! confirm "Continue anyway?"; then
    exit 1
  fi
elif [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 503 ]; then
  log_success "Deployment is accessible (HTTP $HTTP_STATUS)"
else
  log_warning "Deployment returned HTTP $HTTP_STATUS"
  if ! confirm "Deployment may be unhealthy. Continue anyway?"; then
    exit 1
  fi
fi

##############################################
# Rollback Confirmation
##############################################

log_section "⚠️  Rollback Confirmation"

echo -e "${RED}WARNING: This will replace the current production deployment!${NC}"
echo ""
echo "Current production will be replaced with:"
echo "  Deployment: $DEPLOYMENT_ID"
echo "  URL: https://${DEPLOYMENT_ID}.vercel.app"
echo ""

if ! confirm "Are you sure you want to rollback?"; then
  log_info "Rollback cancelled"
  exit 0
fi

if ! confirm "This is your final confirmation. Proceed with rollback?"; then
  log_info "Rollback cancelled"
  exit 0
fi

##############################################
# Execute Rollback
##############################################

log_section "🔄 Executing Rollback"

log_info "Promoting deployment to production..."

# Promote the deployment
if vercel promote "$DEPLOYMENT_ID" --yes; then
  log_success "Deployment promoted successfully"
else
  log_error "Failed to promote deployment"
  exit 1
fi

##############################################
# Verify Rollback
##############################################

log_section "✅ Verifying Rollback"

log_info "Waiting for rollback to propagate..."
sleep 10

# Get production URL
PROD_URL=$(vercel ls --prod | grep "READY" | head -1 | awk '{print $1}')
log_info "Current production URL: $PROD_URL"

# Verify health
log_info "Checking health endpoint..."
PROD_HEALTH_URL="https://${PROD_URL}/health"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_HEALTH_URL")

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 503 ]; then
  log_success "Health check passed (HTTP $HTTP_STATUS)"
else
  log_error "Health check failed (HTTP $HTTP_STATUS)"
  log_warning "Rollback may have failed - check Vercel dashboard"
fi

##############################################
# Create Incident Log
##############################################

log_section "📝 Creating Incident Log"

INCIDENT_LOG="rollback-$(date +%Y%m%d-%H%M%S).log"

cat > "$INCIDENT_LOG" << EOF
========================================
PRODUCTION ROLLBACK LOG
========================================

Timestamp: $(date)
User: $(whoami)
Git Branch: $(git rev-parse --abbrev-ref HEAD)
Git Commit: $(git rev-parse HEAD)

Rollback Details:
  From: Current production
  To: $DEPLOYMENT_ID
  URL: https://${DEPLOYMENT_ID}.vercel.app

Verification:
  Health Check: HTTP $HTTP_STATUS
  Current Production: $PROD_URL

Reason: (Add reason here)

Actions Taken:
  1. Verified target deployment
  2. Promoted deployment to production
  3. Verified health checks

Next Steps:
  1. Monitor error rates in Sentry
  2. Check user reports
  3. Investigate root cause
  4. Plan fix deployment
  5. Document incident

========================================
EOF

log_success "Incident log created: $INCIDENT_LOG"

##############################################
# Rollback Complete
##############################################

log_section "🎉 Rollback Complete"

echo -e "${GREEN}✓${NC} Rollback completed successfully!"
echo ""
echo "📊 Rollback Details:"
echo "  New Production: https://${PROD_URL}"
echo "  Deployment ID: $DEPLOYMENT_ID"
echo "  Time: $(date)"
echo ""
echo "🔗 Quick Links:"
echo "  Production: https://${PROD_URL}"
echo "  Health Check: https://${PROD_URL}/health"
echo "  Vercel Dashboard: https://vercel.com"
echo "  Sentry: https://sentry.io"
echo ""
echo "⚠️  IMPORTANT:"
echo "  1. Monitor application health closely"
echo "  2. Check error rates in Sentry"
echo "  3. Verify critical user flows"
echo "  4. Document the incident in $INCIDENT_LOG"
echo "  5. Plan a proper fix deployment"
echo ""

log_warning "Don't forget to investigate and fix the root cause!"

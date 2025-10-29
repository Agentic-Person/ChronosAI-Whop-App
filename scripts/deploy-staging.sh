#!/bin/bash

##############################################
# Staging Deployment Script
##############################################
#
# Automated deployment to Vercel staging (preview) environment.
# This script handles the full deployment workflow:
# 1. Pre-flight checks
# 2. Environment validation
# 3. Build verification
# 4. Vercel staging deployment
# 5. Post-deployment verification
#
# Usage: ./scripts/deploy-staging.sh [options]
#
# Options:
#   --skip-tests     Skip test execution (faster deployment)
#   --force          Skip confirmation prompts
#   --dry-run        Show what would be deployed without deploying
#   --skip-health    Skip post-deployment health check
##############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_TESTS=false
FORCE=false
DRY_RUN=false
SKIP_HEALTH=false

for arg in "$@"; do
  case $arg in
    --skip-tests)
      SKIP_TESTS=true
      ;;
    --force)
      FORCE=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    --skip-health)
      SKIP_HEALTH=true
      ;;
    --help)
      echo "Usage: ./scripts/deploy-staging.sh [options]"
      echo ""
      echo "Options:"
      echo "  --skip-tests     Skip test execution (faster deployment)"
      echo "  --force          Skip confirmation prompts"
      echo "  --dry-run        Show what would be deployed without deploying"
      echo "  --skip-health    Skip post-deployment health check"
      echo "  --help           Show this help message"
      exit 0
      ;;
  esac
done

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

log_step() {
  echo -e "${MAGENTA}▸${NC} $1"
}

confirm() {
  if [ "$FORCE" = true ]; then
    return 0
  fi

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

    # Provide installation instructions
    case $1 in
      vercel)
        echo ""
        echo "Install Vercel CLI:"
        echo "  npm install -g vercel"
        echo ""
        ;;
      node)
        echo ""
        echo "Install Node.js from: https://nodejs.org/"
        echo ""
        ;;
      git)
        echo ""
        echo "Install Git from: https://git-scm.com/"
        echo ""
        ;;
    esac

    exit 1
  fi
}

##############################################
# Banner
##############################################

echo ""
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║          AI Video Learning Assistant                       ║"
echo "║          Staging Deployment Script                         ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

##############################################
# Pre-flight Checks
##############################################

log_section "🔍 Pre-flight Checks"

# Check required commands
log_step "Checking required commands..."
check_command node
check_command npm
check_command git
check_command vercel
log_success "All required commands available"

# Check Node version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
  log_error "Node.js version must be 18 or higher (current: $(node -v))"
  exit 1
fi
log_success "Node.js version: $(node -v)"

# Check Vercel authentication
log_step "Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
  log_error "Not authenticated with Vercel. Please run: vercel login"
  exit 1
fi
VERCEL_USER=$(vercel whoami)
log_success "Authenticated as: $VERCEL_USER"

# Check git status
log_step "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
  log_warning "Working directory is not clean"
  git status --short
  echo ""
  if ! confirm "Continue with uncommitted changes?"; then
    log_info "Commit or stash changes before deploying"
    exit 1
  fi
else
  log_success "Working directory is clean"
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log_info "Current branch: ${CYAN}$CURRENT_BRANCH${NC}"

# Recommend staging branch
if [ "$CURRENT_BRANCH" != "staging" ]; then
  log_warning "You are not on the 'staging' branch"
  log_info "Recommended: Deploy from 'staging' branch for consistent preview URLs"
  if ! confirm "Deploy from '$CURRENT_BRANCH' branch?"; then
    log_info "Switch to staging branch: git checkout staging"
    exit 1
  fi
fi

# Get current commit
COMMIT_SHA=$(git rev-parse HEAD)
COMMIT_SHORT=${COMMIT_SHA:0:7}
COMMIT_MSG=$(git log -1 --pretty=%B)
log_info "Deploying commit: ${CYAN}$COMMIT_SHORT${NC}"
log_info "Commit message: \"$COMMIT_MSG\""

##############################################
# Environment Validation
##############################################

log_section "🔐 Environment Validation"

log_step "Validating required environment variables..."

# Critical environment variables for staging
REQUIRED_VARS=(
  "WHOP_API_KEY"
  "NEXT_PUBLIC_WHOP_APP_ID"
  "WHOP_CLIENT_ID"
  "WHOP_CLIENT_SECRET"
  "WHOP_WEBHOOK_SECRET"
  "WHOP_TOKEN_ENCRYPTION_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "ANTHROPIC_API_KEY"
  "OPENAI_API_KEY"
)

MISSING_VARS=()

# Note: We can't directly check Vercel env vars without deploying
# This is just a reminder for the user
log_info "Ensure these variables are set in Vercel (Preview environment):"
echo ""
for var in "${REQUIRED_VARS[@]}"; do
  echo "  - $var"
done
echo ""
log_warning "This script cannot verify Vercel environment variables directly"
log_info "Verify in: Vercel Dashboard → Settings → Environment Variables"
echo ""

if ! confirm "Have you configured all required environment variables in Vercel?"; then
  log_error "Please configure environment variables before deploying"
  log_info "See: PRODUCTION_ENV_CHECKLIST.md for details"
  exit 1
fi

log_success "Environment validation acknowledged"

##############################################
# Dependency Check
##############################################

log_section "📦 Dependency Check"

log_step "Installing dependencies..."
if npm ci --quiet; then
  log_success "Dependencies installed"
else
  log_error "Dependency installation failed"
  exit 1
fi

##############################################
# Run Tests
##############################################

if [ "$SKIP_TESTS" = false ]; then
  log_section "🧪 Running Tests"

  log_step "Running linter..."
  if npm run lint; then
    log_success "Linting passed"
  else
    log_error "Linting failed"
    if ! confirm "Continue deployment despite lint errors?"; then
      exit 1
    fi
  fi

  log_step "Running unit tests..."
  if npm run test -- --passWithNoTests; then
    log_success "Tests passed"
  else
    log_error "Tests failed"
    if ! confirm "Continue deployment despite test failures?"; then
      exit 1
    fi
  fi
else
  log_warning "Skipping tests (--skip-tests flag)"
fi

##############################################
# Build Application
##############################################

log_section "🔨 Building Application"

log_step "Running production build..."
BUILD_START=$(date +%s)

if npm run build; then
  BUILD_END=$(date +%s)
  BUILD_TIME=$((BUILD_END - BUILD_START))
  log_success "Build completed in ${BUILD_TIME}s"
else
  log_error "Build failed"
  log_info "Fix build errors and try again"
  exit 1
fi

# Check build output
if [ ! -d ".next" ]; then
  log_error "Build output directory (.next) not found"
  exit 1
fi

# Get build size
BUILD_SIZE=$(du -sh .next | cut -f1)
log_info "Build size: ${CYAN}$BUILD_SIZE${NC}"

##############################################
# Dry Run Check
##############################################

if [ "$DRY_RUN" = true ]; then
  log_section "🔍 Dry Run Complete"
  log_success "Build successful - deployment would proceed"
  echo ""
  log_info "Deployment would include:"
  echo "  Branch: $CURRENT_BRANCH"
  echo "  Commit: $COMMIT_SHORT"
  echo "  Build Size: $BUILD_SIZE"
  echo "  Build Time: ${BUILD_TIME}s"
  echo ""
  log_info "Run without --dry-run to deploy"
  exit 0
fi

##############################################
# Pre-deployment Confirmation
##############################################

log_section "⚠️  Pre-deployment Confirmation"

echo -e "${CYAN}Deployment Summary:${NC}"
echo "  Environment: ${MAGENTA}Staging (Preview)${NC}"
echo "  Branch: ${CYAN}$CURRENT_BRANCH${NC}"
echo "  Commit: ${CYAN}$COMMIT_SHORT${NC}"
echo "  Build Size: ${CYAN}$BUILD_SIZE${NC}"
echo "  Build Time: ${CYAN}${BUILD_TIME}s${NC}"
echo "  Vercel User: ${CYAN}$VERCEL_USER${NC}"
echo ""

if ! confirm "Deploy to Vercel staging environment?"; then
  log_info "Deployment cancelled"
  exit 0
fi

##############################################
# Deploy to Vercel (Preview)
##############################################

log_section "🚀 Deploying to Vercel"

DEPLOY_START=$(date +%s)

log_step "Deploying to preview environment..."
echo ""

# Deploy to Vercel preview (not production)
# The --yes flag skips interactive prompts
if DEPLOYMENT_URL=$(vercel --yes 2>&1 | tee /dev/tty | grep -oP 'https://[^\s]+' | tail -1); then
  DEPLOY_END=$(date +%s)
  DEPLOY_TIME=$((DEPLOY_END - DEPLOY_START))

  echo ""
  log_success "Deployed in ${DEPLOY_TIME}s"
  log_success "Staging URL: ${GREEN}$DEPLOYMENT_URL${NC}"
else
  echo ""
  log_error "Deployment failed"
  log_info "Check Vercel dashboard for details: https://vercel.com/dashboard"
  exit 1
fi

# Save deployment URL for later use
echo "$DEPLOYMENT_URL" > .deployment-url.tmp

##############################################
# Post-deployment Verification
##############################################

if [ "$SKIP_HEALTH" = false ]; then
  log_section "✅ Post-deployment Verification"

  log_step "Waiting for deployment to be ready..."
  sleep 10

  # Check health endpoint
  log_step "Checking health endpoint..."
  HEALTH_URL="$DEPLOYMENT_URL/api/health"

  if HTTP_STATUS=$(curl -s -o /tmp/health-response.json -w "%{http_code}" "$HEALTH_URL"); then
    if [ "$HTTP_STATUS" -eq 200 ]; then
      log_success "Health check passed (HTTP 200)"

      # Parse health check response
      if command -v jq &> /dev/null; then
        HEALTH_STATUS=$(jq -r '.status' /tmp/health-response.json 2>/dev/null || echo "unknown")
        echo ""
        log_info "Health Status: $HEALTH_STATUS"

        # Show component health
        DB_STATUS=$(jq -r '.checks.database.status' /tmp/health-response.json 2>/dev/null || echo "unknown")
        CACHE_STATUS=$(jq -r '.checks.cache.status' /tmp/health-response.json 2>/dev/null || echo "unknown")

        if [ "$DB_STATUS" = "ok" ]; then
          echo "  ${GREEN}✓${NC} Database: OK"
        else
          echo "  ${RED}✗${NC} Database: Error"
        fi

        if [ "$CACHE_STATUS" = "ok" ]; then
          echo "  ${GREEN}✓${NC} Cache: OK"
        else
          echo "  ${YELLOW}⚠${NC} Cache: Error (non-critical)"
        fi
      fi
    elif [ "$HTTP_STATUS" -eq 503 ]; then
      log_warning "Health check returned HTTP 503 (service degraded)"
      log_info "Some services may be unavailable - check logs"
    else
      log_error "Health check failed (HTTP $HTTP_STATUS)"
      log_warning "Deployment may be unhealthy - verify manually"
    fi
  else
    log_error "Failed to connect to health endpoint"
    log_warning "Deployment may still be initializing - check manually in 1-2 minutes"
  fi

  # Check homepage
  log_step "Checking homepage..."
  if HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL"); then
    if [ "$HOME_STATUS" -eq 200 ]; then
      log_success "Homepage accessible (HTTP 200)"
    else
      log_warning "Homepage returned HTTP $HOME_STATUS"
    fi
  else
    log_error "Failed to connect to homepage"
  fi

  # Run health check script if available
  if [ -f "scripts/test-health.sh" ]; then
    log_step "Running comprehensive health checks..."
    if bash scripts/test-health.sh "$DEPLOYMENT_URL"; then
      log_success "All health checks passed"
    else
      log_warning "Some health checks failed - review output above"
    fi
  fi
else
  log_warning "Skipping health checks (--skip-health flag)"
fi

##############################################
# Update Environment Variables
##############################################

log_section "🔧 Environment Variables Update"

log_info "Update NEXT_PUBLIC_APP_URL in Vercel to match staging URL:"
echo ""
echo "  1. Go to: https://vercel.com/dashboard"
echo "  2. Navigate to: Settings → Environment Variables"
echo "  3. Update NEXT_PUBLIC_APP_URL to:"
echo "     ${GREEN}$DEPLOYMENT_URL${NC}"
echo "  4. Select 'Preview' environment"
echo "  5. Save and redeploy"
echo ""
log_warning "Also update Whop OAuth redirect URI to:"
echo "  ${GREEN}$DEPLOYMENT_URL/api/whop/auth/callback${NC}"
echo ""

##############################################
# Deployment Complete
##############################################

log_section "🎉 Staging Deployment Complete"

echo -e "${GREEN}✓${NC} Staging deployment successful!"
echo ""
echo "📊 Deployment Details:"
echo "  Environment: Staging (Preview)"
echo "  URL: ${GREEN}$DEPLOYMENT_URL${NC}"
echo "  Branch: $CURRENT_BRANCH"
echo "  Commit: $COMMIT_SHORT"
echo "  Build Time: ${BUILD_TIME}s"
echo "  Deploy Time: ${DEPLOY_TIME}s"
echo "  Total Time: $((BUILD_TIME + DEPLOY_TIME))s"
echo ""
echo "🔗 Quick Links:"
echo "  Homepage: $DEPLOYMENT_URL"
echo "  Dashboard: $DEPLOYMENT_URL/dashboard"
echo "  Health: $DEPLOYMENT_URL/api/health"
echo "  Vercel Dashboard: https://vercel.com/dashboard"
echo ""
echo "📝 Next Steps:"
echo "  1. Update NEXT_PUBLIC_APP_URL in Vercel (see above)"
echo "  2. Update Whop OAuth redirect URI (see above)"
echo "  3. Test authentication flow"
echo "  4. Verify critical features:"
echo "     - Video upload and processing"
echo "     - AI chat with RAG search"
echo "     - Quiz generation"
echo "  5. Monitor logs: vercel logs --follow"
echo "  6. If issues found, rollback with: vercel rollback"
echo ""
echo "📚 Documentation:"
echo "  - Staging Guide: docs/STAGING_DEPLOYMENT.md"
echo "  - Environment Vars: PRODUCTION_ENV_CHECKLIST.md"
echo "  - Health Checks: scripts/test-health.sh"
echo ""

# Save deployment info to file
DEPLOY_INFO_FILE=".last-staging-deployment.json"
cat > "$DEPLOY_INFO_FILE" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "branch": "$CURRENT_BRANCH",
  "commit": "$COMMIT_SHA",
  "commit_short": "$COMMIT_SHORT",
  "commit_message": "$COMMIT_MSG",
  "deployment_url": "$DEPLOYMENT_URL",
  "vercel_user": "$VERCEL_USER",
  "build_time_seconds": $BUILD_TIME,
  "deploy_time_seconds": $DEPLOY_TIME,
  "build_size": "$BUILD_SIZE"
}
EOF
log_info "Deployment info saved to: $DEPLOY_INFO_FILE"

# Cleanup temporary files
rm -f .deployment-url.tmp /tmp/health-response.json

echo ""
log_success "Deployment completed at $(date)"
echo ""
